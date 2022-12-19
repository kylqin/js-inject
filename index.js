import cloneDeep from 'lodash/cloneDeep.js';
import isPlainObject from 'lodash/isPlainObject.js';
import set from 'lodash/set.js';
import get from 'lodash/get.js';
import unset from 'lodash/unset.js';
import assign from 'lodash/assign.js';
import has from 'lodash/has.js';

/**
 * Specification
 */
const INJECT_SPEC = {
  object: {
    key: '<i>:',
    merge: '<...>',
  },
  array: {
    item: '<i>',
  },
};

const createSpecUtils = (spec) => {
  // (key, value) => (pc, ref)
  const objKey = (key, value) => [
    value && key !== spec.object.key && key !== spec.object.merge && key.startsWith(spec.object.key) ?
    key.slice(spec.object.key.length) :
    '',
    value,
  ];
  // (key, value) => (pc, ref)
  const objMerge = (key, value) => [value && key === spec.object.merge && '...', value];
  // (idx, item) => (pc, ref)
  const arrItem = (idx, item) => [idx, Object.keys(item).length === 1 && item[spec.array.item]];
  return {
    objKey,
    objMerge,
    // (key, value) => (pc, ref, type)
    objKM: (key, value) => {
      const [pc, ref] = objKey(key, value);
      if (pc && ref) return [pc, ref, PCType.key];
      return objMerge(key, value).concat([PCType.mrg]);
    },
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
  key: 'K',
  mrg: 'M',
  idx: 'I',
};
const PCSep = {
  tv: ':',
  pc: '|',
};

const createPCUtils = (spec) => {
  const asKeyPC = (value) => ({
    type: PCType.key,
    value,
  });
  const asMrgPC = (value) => ({
    type: PCType.mrg,
    value,
  });
  const asIdxPC = (value) => ({
    type: PCType.idx,
    value,
  });

  const joinPC = (pcs, level) => ({
    endsWith: pcs[level].type,
    pcs: pcs.slice(0, level + 1).map((pc) => `${pc.type}${PCSep.tv}${pc.value}`).join(PCSep.pc),
  });
  const parsePC = (joinedPCs, asSpecFmt) => {
    const tvs = joinedPCs.pcs.split(PCSep.pc);
    return tvs.map((tv, idx) => {
      const [type, value] = tv.split(PCSep.tv);
      if (asSpecFmt && idx === tvs.length - 1) {
        if (type === PCType.key) {
          return {
            type,
            value: `${spec.object.key}${value}`,
          };
        }
        if (type === PCType.mrg) {
          return {
            type,
            value: spec.object.merge,
          };
        }
      }
      return {
        type,
        value,
      };
    }).map((pc) => pc.value);
  };

  return {
    asKey: asKeyPC,
    asIdx: asIdxPC,
    asMrg: asMrgPC,
    join: joinPC,
    parse: parsePC,
  };
};

/**
 * Injection
 */
export default {
  provide,
  build,
};

const GlobalContext = Object.create(null);

const DefaultOptions = {
  total: true,
};

function provide(key, value) {
  GlobalContext[key] = value;
}

const DefaultParserOptions = {
  spec: {
    objectKey: INJECT_SPEC.object.key,
    objectMerge: INJECT_SPEC.object.merge,
    arrayItem: INJECT_SPEC.array.item,
  },
};

const buildSpec = (parserOptions) => {
  const oSpec = parserOptions || {};
  return {
    object: {
      key: oSpec.objectKey || DefaultParserOptions.spec.objectKey,
      merge: oSpec.objectMerge || DefaultParserOptions.spec.objectMerge,
    },
    array: {
      item: oSpec.arrayItem || DefaultParserOptions.spec.arrayItem,
    },
  };
};

function build(object, parserOptions = DefaultParserOptions) {
  const clonedObject = cloneDeep(object);
  const memorizedPaths = Object.create(null);
  const tracedPCs = [];
  const spec = buildSpec(parserOptions);
  const specGet = createSpecUtils(spec);
  const pcUtils = createPCUtils(spec);

  const memo = (obj, level) => {
    if (Array.isArray(obj)) {
      for (const [idx, item] of Object.entries(obj)) {
        const [pc, ref] = specGet.arrItem(idx, item);
        tracedPCs[level] = pcUtils.asIdx(pc);
        if (ref) {
          memorizedPaths[ref] = pcUtils.join(tracedPCs, level);
        } else {
          memo(item, level + 1);
        }
      }
    } else if (isPlainObject(obj)) {
      const ref = specGet.objRef(obj);
      if (ref) {
        memorizedPaths[ref] = pcUtils.join(tracedPCs, level);
      } else {
        for (const [key, value] of Object.entries(obj)) {
          const [pc, ref, type] = specGet.objKM(key, value);
          if (pc && ref) {
            tracedPCs[level] = type === PCType.key ? pcUtils.asKey(pc) : pcUtils.asMrg(pc);
            memorizedPaths[ref] = pcUtils.join(tracedPCs, level);
          } else {
            tracedPCs[level] = pcUtils.asKey(key);
            memo(value, level + 1);
          }
        }
      }
    }
  };

  memo([clonedObject], 0);

  const update = (obj, context = GlobalContext, options = DefaultOptions) => {
    const permit = createPermit(context, options);

    for (const [key, joinedPCs] of Object.entries(memorizedPaths)) {
      if (permit(key)) {
        const ps = pcUtils.parse(joinedPCs);
        if (joinedPCs.endsWith === PCType.mrg) {
          const prePs = ps.slice(0, ps.length - 1);
          const merged = get(obj, prePs);
          assign(merged, context[key]);
          set(obj, prePs, merged);
        } else {
          set(obj, ps, context[key]);
        }
      }
      if (joinedPCs.endsWith === PCType.key || joinedPCs.endsWith === PCType.mrg) {
        unset(obj, pcUtils.parse(joinedPCs, true));
      }
    }
    return cloneDeep(obj);
  };

  return {
    inject: (context = GlobalContext, options = DefaultOptions) => update([clonedObject], context, options)[0],
    injectOn: (obj, context = GlobalContext, options = DefaultOptions) => update([obj], context, options)[0],
    memorizedPaths,
  };
}

function createPermit(context, options = DefaultOptions) {
  const {
    only,
    omit,
    total,
  } = options;

  if (total) {
    return (k) => {
      if (!has(context, k)) {
        // 没有值时报错
        console.error(`Ref: ${k} 没有在 Context 中解析成功, 当 options.total 为 true 时，需要为每个 ref 提供一个值`);
      }
      return true;
    };
  }

  const filters = [];
  const permit = (key) => {
    for (const f of filters) {
      if (!f(key)) return false;
    }
    return true;
  };

  if (only === true || omit === true) {
    filters.push((k) => has(context, k));
  }
  if (Array.isArray(only)) {
    filters.push((k) => only.includes(k));
  }
  if (Array.isArray(omit)) {
    filters.push((k) => omit.includes(k));
  }

  return permit;
}