// import cloneDeep from 'lodash/cloneDeep';
// import isPlainObject from 'lodash/isPlainObject';
// import set from 'lodash/set';
// import unset from 'lodash/unset';
// import has from 'lodash/has';

const cloneDeep = require('lodash/cloneDeep');
const isPlainObject = require('lodash/isPlainObject');
const set = require('lodash/set');
const get = require('lodash/get');
const assign = require('lodash/assign');
const unset = require('lodash/unset');
const has = require('lodash/has');

/**
 * Specification
 */
const INJECT_SPEC = {
	object: {
		key: '<i>:',
		merge: '<...>'
	},
	array: {
		item: '<i>',
	}
};

const createSpecUtils = (spec) => {
	const arrItem = (idx, item) => [idx, Object.keys(item).length === 1 && item[spec.array.item]];
	return {
		// (key, value) => (pc, ref)
		objKey: (key, value) => [
			value && key !== spec.object.key && key !== spec.object.merge && key.startsWith(spec.object.key) ?
			key.slice(spec.object.key.length) :
			'',
			value
		],
		// (key, value) => (pc, ref)
		objMerge: (key, value) => [value && key === spec.object.merge && '...', value],
		// (idx, item) => (pc, ref)
		arrItem,
		// obj => ref
		objRef: (obj) => arrItem(0, obj)[1],
	};
};


/**
 * Path Component
 * @define type PathComp = { type: PCType[string], value: string | number }
 */
// object, array, object-merge
const PCType = {
	obj: 'o',
	mrg: 'om',
	arr: 'a'
};
const PCSep = {
	tv: ':',
	pc: '|'
};

const createPCUtils = spec => {
	const objPC = value => ({
		type: PCType.obj,
		value
	});
	const mrgPC = value => ({
		type: PCType.mrg,
		value
	});
	const arrPC = value => ({
		type: PCType.arr,
		value
	});

	const joinPC = (pcs, level) => ({
		endsWith: pcs[level].type,
		pcs: pcs.slice(0, level + 1).map(pc => `${pc.type}${PCSep.tv}${pc.value}`).join(PCSep.pc)
	});
	const parsePC = (joinedPCs, asSpecFmt) => {
		const tvs = joinedPCs.pcs.split(PCSep.pc);
		return tvs.map((tv, idx) => {
			const [type, value] = tv.split(PCSep.tv);
			if (asSpecFmt && idx === tvs.length - 1) {
				if (type === PCType.obj) {
					return {
						type,
						value: `${spec.object.key}${value}`
					};
				}
				if (type === PCType.mrg) {
					return {
						type,
						value: spec.object.merge
					};
				}
			}
			return {
				type,
				value
			};
		}).map(pc => pc.value);
	};

	return {
		obj: objPC,
		arr: arrPC,
		mrg: mrgPC,
		join: joinPC,
		parse: parsePC
	};
};


/**
 * Injection
 */
// export default {
// 	provide,
// 	inject,
// };
module.exports = {
	provide,
	inject
};

const GlobalContext = Object.create(null);

const DefaultOptions = {
	total: true
};

function provide(key, value) {
	GlobalContext[key] = value;
}

const DefaultParserOptions = {
	spec: {
		objectKey: INJECT_SPEC.object.key,
		objectMerge: INJECT_SPEC.object.merge,
		arrayItem: INJECT_SPEC.array.item
	}
};

const buildSpec = parserOptions => {
	const oSpec = parserOptions || {};
	return {
		object: {
			key: oSpec.objectKey || DefaultParserOptions.spec.objectKey,
			merge: oSpec.objectMerge || DefaultParserOptions.spec.objectMerge,
		},
		array: {
			item: oSpec.arrayItem || DefaultParserOptions.spec.arrayItem
		}
	};
};

function inject(object, parserOptions = DefaultParserOptions) {
	const clonedObject = cloneDeep(object);
	const memorizedPaths = Object.create(null);
	const spec = buildSpec(parserOptions);
	const specUtils = createSpecUtils(spec);
	const pcUtils = createPCUtils(spec);

	const memo = (obj, paths, level) => {
		if (Array.isArray(obj)) {
			for (const [idx, item] of Object.entries(obj)) {
				const [pc, ref] = specUtils.arrItem(idx, item);
				paths[level] = pcUtils.arr(pc);
				if (ref) {
					memorizedPaths[ref] = pcUtils.join(paths, level);
				} else {
					memo(item, paths, level + 1);
				}
			}
		} else if (isPlainObject(obj)) {
			const ref = specUtils.objRef(obj)
			if (ref) {
				memorizedPaths[ref] = pcUtils.join(paths, level);
			} else {
				for (const [key, value] of Object.entries(obj)) {
					let [pc, ref] = specUtils.objKey(key, value);
					if (pc && ref) {
						paths[level] = pcUtils.obj(pc);
						memorizedPaths[ref] = pcUtils.join(paths, level);
						continue;
					}
					[pc, ref] = specUtils.objMerge(key, value);
					if (pc && ref) {
						paths[level] = pcUtils.mrg(pc);
						memorizedPaths[ref] = pcUtils.join(paths, level);
						continue;
					}
					paths[level] = pcUtils.obj(key);
					memo(value, paths, level + 1);
				}
			}
		}
	}

	memo([object], [], 0);

	const update = (obj, context = GlobalContext, options = DefaultOptions) => {
		const permit = createPermit(context, options);

		for (const [key, joinedPCs] of Object.entries(memorizedPaths)) {
			if (permit(key)) {
				const ps = pcUtils.parse(joinedPCs);
				if (joinedPCs.endsWith === PCType.mrg) {
					const prePs = ps.slice(0, ps.length - 1);
					const merged = get(obj, prePs);
					assign(merged, context[key]);
					set(obj, prePs, merged)
				} else {
					set(obj, ps, context[key]);
				}
			}
			if (joinedPCs.endsWith === PCType.obj || joinedPCs.endsWith === PCType.mrg) {
				unset(obj, pcUtils.parse(joinedPCs, true));
			}
		}
		return obj;
	};

	return {
		inject: (context = GlobalContext, options = DefaultOptions) => update([clonedObject], context, options)[0],
		injectOn: (obj, context = GlobalContext, options = DefaultOptions) => update([obj], context, options)[0],
		memorizedPaths
	};
}

function createPermit(context, options = DefaultOptions) {
	const {
		only,
		omit,
		total
	} = options;

	if (total) {
		return (k) => {
			if (!has(context, k)) {
				// 没有值时报错
				console.error(`Ref: ${k} 没有在 Context 中解析成功, 当 options.total 为 true 时，需要为每个 ref 提供一个值`)
			}
			return true;
		};
	}

	const filters = [];
	const prmit = key => {
		for (const f of filters) {
			if (!f(k)) return false;
		}
		return true;
	}

	if (only === true || omit === true) {
		filters.push(k => has(context, k));
	}
	if (Array.isArray(only)) {
		filters.push(k => only.includes(k));
	}
	if (Array.isArray(omit)) {
		filters.push(k => omit.includes(k));
	}

	return permit;
}