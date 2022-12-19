import J from '../index.js';
import {
	expect
} from 'chai';

describe('测试 inject', () => {
	it('Function `inject` create a Injector', () => {
		const obj = {
			a: 'A',
			b: 'B',
			c: ['c', 'd']
		};
		const injector = J.build(obj);

		expect(injector.inject).to.be.a('function');
		expect(injector.injectOn).to.be.a('function');
	});

	it('Injector work on root object KEY', () => {
		const obj = {
			'<i>:mike': 'keyMike'
		};
		const value = 'A string value';
		expect(J.build(obj).inject({
				keyMike: value
			})) //
			.deep.equal({
				mike: value
			});

		const aObjRef = {
			mike: 'js',
			kyle: 'q'
		};

		expect(J.build(obj).inject({
				keyMike: aObjRef
			})) //
			.deep.equal({
				mike: aObjRef
			});
	});

	it('Injector work on root object REF', () => {
		const obj = {
			'<i>': 'ref'
		};
		const ref = 'A string value';
		expect(J.build(obj).inject({
			ref: ref
		})).to.equal(ref);

		const aObjRef = {
			mike: 'js',
			kyle: 'q'
		};

		expect(J.build(obj).inject({
			ref: aObjRef
		})).deep.equal(aObjRef);
	});

	it('Injector work on root object MERGE', () => {
		const obj = {
			a: 'A',
			'<...>': 'merged',
			c: 'C'
		};

		const merged = {
			j: 'J',
			k: 'K'
		};

		expect(
				J.build(obj).inject({
					merged
				})) //
			.deep.equal({
				a: 'A',
				c: 'C',
				j: 'J',
				k: 'K'
			});

		const mergedConflict = {
			j: 'J',
			c: 'conflict-c'
		};

		expect(
				J.build(obj).inject({
					merged: mergedConflict
				})) //
			.deep.equal({
				a: 'A',
				c: 'conflict-c',
				j: 'J'
			});
	});

	it('Injector work on root array ITEM', () => {
		const obj = [
			'a',
			{
				'<i>': 'ref'
			},
			'c'
		];

		expect(J.build(obj).inject({
				ref: 'B'
			}))
			.deep.equal(['a', 'B', 'c']);
	});

	it('Injector work on DEEP object KEY', () => {
		const obj = {
			a: 'A',
			b: 'B',
			c: {
				ca: 'CA',
				'<i>:cb': 'keyCB',
				cc: 'CC'
			},
			d: 'D'
		};

		expect(J.build(obj).inject({
				keyCB: 'Mike CB'
			})) //
			.deep.equal({
				a: 'A',
				b: 'B',
				c: {
					ca: 'CA',
					cb: 'Mike CB',
					cc: 'CC'
				},
				d: 'D'
			});
	});

	it('Injector work on DEEP object MERGE', () => {
		const obj = {
			a: 'A',
			b: 'B',
			c: {
				ca: 'CA',
				'<...>': 'keyCB',
				cc: 'CC'
			},
			d: 'D'
		};

		expect(J.build(obj).inject({
				keyCB: {
					cb: 'Just CB',
					cd: 'Just CD'
				}
			})) //
			.deep.equal({
				a: 'A',
				b: 'B',
				c: {
					ca: 'CA',
					cb: 'Just CB',
					cc: 'CC',
					cd: 'Just CD'
				},
				d: 'D'
			});

		expect(J.build(obj).inject({
				keyCB: {
					cb: 'Just CB',
					cc: 'Just CC'
				}
			})) //
			.deep.equal({
				a: 'A',
				b: 'B',
				c: {
					ca: 'CA',
					cb: 'Just CB',
					cc: 'Just CC'
				},
				d: 'D'
			});
	});

	it('Injector work on DEEP array ITEM', () => {
		const obj = {
			a: 'A',
			b: 'B',
			c: [
				'CA',
				{
					'<i>': 'refCB'
				},
				'CC',
				[
					'CDC',
					'CDB',
					{
						'<i>': 'refCDC'
					},
					{
						cdd: [
							'CDDA',
							'CDDB',
							'CDDC',
							{
								'<i>': 'refCDDD'
							}
						]
					}
				],
				'CE'
			],
			d: 'D'
		};

		expect(J.build(obj).inject({
				refCB: 'kyle CB',
				refCDC: 'kyle CDC',
				refCDDD: {
					name: 'kyle CDDD'
				}
			})) //
			.deep.equal({
				a: 'A',
				b: 'B',
				c: [
					'CA',
					'kyle CB',
					'CC',
					[
						'CDC',
						'CDB',
						'kyle CDC',
						{
							cdd: [
								'CDDA',
								'CDDB',
								'CDDC',
								{
									name: 'kyle CDDD'
								}
							]
						}
					],
					'CE'
				],
				d: 'D'
			});
	});

	it('Inject work on a 综合实例', () => {
		const obj = {
			a: 'A',
			'<i>:jack': 'oh',
			'<...>': 'rootMerged',
			arr: [
				'one',
				{
					'<i>': 'two',
				},
				'three',
				{
					key: 'four',
					'<i>:check': 'out',
					'<...>': 'merged',
					cook: 'it',
					list: [
						'la',
						'lb',
						{
							'<i>': 'make',
						},
						'ld',
						{
							'<i>': 'long',
						},
					],
				},
				'five',
			],
		};

		expect(J.build(obj).inject({
				oh: '<<HO MY God>>',
				out: '<<出去>>',
				make: '<<LOVE>>',
				two: '<<这是个什么东西>>',
				long: {
					long: '<<龙>>',
				},
				merged: {
					'merged - kyle': 'qin',
					'merged - jack': 'chen',
					'merged - larry': 'Lan',
				},
				rootMerged: {
					'rootMerged-<<<<shift>>>>': 'make',
					'rootMerged-MIKE': 'Koliang',
				},
			})) //
			.deep.equal({
				"a": "A",
				"arr": [
					"one",
					"<<这是个什么东西>>",
					"three",
					{
						"key": "four",
						"cook": "it",
						"list": [
							"la",
							"lb",
							"<<LOVE>>",
							"ld",
							{
								"long": "<<龙>>"
							}
						],
						"check": "<<出去>>",
						"merged - kyle": "qin",
						"merged - jack": "chen",
						"merged - larry": "Lan"
					},
					"five"
				],
				"jack": "<<HO MY God>>",
				"rootMerged-<<<<shift>>>>": "make",
				"rootMerged-MIKE": "Koliang"
			})
	});
});

describe('测试 inject 的积累性', () => {
	it('Injector can acculumate the injection', () => {
		const obj = {
			a: {
				mm: 'MM',
				'<i>:look': 'up',
				'<i>:protocol': 'http',
				nn: 'NN'
			},
			b: 'B',
			'<i>:dict': 'dictionary'
		};

		const injector = J.build(obj);

		expect(injector.inject({
				http: 'HTTP'
			}, {
				only: true
			})) //
			.deep.equal({
				a: {
					mm: 'MM',
					protocol: 'HTTP',
					nn: 'NN'
				},
				b: 'B',
			});

		expect(injector.inject({
				up: 'UP',
				dictionary: 'Youdao'
			}, {
				only: true
			})) //
			.deep.equal({
				a: {
					mm: 'MM',
					look: 'UP',
					protocol: 'HTTP',
					nn: 'NN'
				},
				b: 'B',
				dict: 'Youdao'
			});
	});
});