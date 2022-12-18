import J from '../index.js';

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

const p = (o) => JSON.stringify(o, null, 2);

const injObj = J.inject(obj);
// console.log((injObj));
console.log(injObj.memorizedPaths);

console.log(p(obj));

console.log(p(injObj.inject({
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
})));

const rootArr = [
  'a',
  {
    '<i>': 'rootItem',
  },
  'c',
];
const injRootArr = J.inject(rootArr);

console.log(p(rootArr));
console.log(p(injRootArr.inject({
  rootItem: {
    Greate: 'Wall',
  },
})));

const rootObjRef = {
  '<i>': 'rootRef',
};
console.log(p(rootObjRef));

const injRootObjRef = J.inject(rootObjRef);
console.log(injRootObjRef.memorizedPaths);
console.log(p(injRootObjRef.inject({
  rootRef: {
    'rootRef-oh': 'no',
    'rootRef-big': 'small',
  },
})));

const rootObjMerge = {
  check: 'OUT',
  '<...>': 'rootMerged',
  kugou: '音乐',
};
console.log(p(rootObjMerge));
const injRootObjMerge = J.inject(rootObjMerge);
console.log(injRootObjMerge.memorizedPaths);
console.log(p(injRootObjMerge.inject({
  rootMerged: {
    'rootMerged-oh': 'no',
    'rootMerged-big': 'small',
  },
})));
