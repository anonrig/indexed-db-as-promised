export function classCallCheck() {}

export function createClass(Constructor, protoProps) {
  const prototype = Constructor.prototype;
  for (let i = 0; i < protoProps.length; i++) {
    const descriptor = protoProps[i];
    descriptor.enumerable = descriptor.configurable = true;
    Object.defineProperty(prototype, descriptor.key, descriptor);
  }
}

export function inherits(subClass, superClass) {
  subClass.prototype = Object.create(superClass.prototype, {
    constructor: {
      configurable: true,
      writable: true,
      value: subClass,
    },
  });
}

export function possibleConstructorReturn(self, call) {
  return call || self;
}

export function interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {
    default: obj,
  };
}
