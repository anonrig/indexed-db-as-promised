/**
 * Copyright 2015 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export default class SyncPromise {
  constructor(resolver) {
    if (!isFunction(resolver)) {
      throw new TypeError('Must pass resolver function');
    }

    this.state_ = PendingPromise;
    this.value_ = [];

    doResolve(
      this,
      adopter(this, FulfilledPromise),
      adopter(this, RejectedPromise),
      { then: resolver }
    );
  }

  then(onFulfilled, onRejected) {
    onFulfilled = isFunction(onFulfilled) ? onFulfilled : returner;
    onRejected = isFunction(onRejected) ? onRejected : thrower;
    return this.state_(this.value_, onFulfilled, onRejected);
  }

  catch(onRejected) {
    return this.then(void 0, onRejected);
  }

  static resolve(value) {
    if (isObject(value) && value instanceof SyncPromise) {
      return value;
    }

    return new SyncPromise((resolve) => resolve(value));
  }

  static reject(reason) {
    return new SyncPromise((_, reject) => reject(reason));
  }

  static all(promises) {
    return new SyncPromise((resolve, reject) => {
      let length = promises.length;
      const values = new Array(length);

      if (length == 0) {
        resolve(values);
        return;
      }

      each(promises, (promise, index) => {
        SyncPromise.resolve(promise).then((value) => {
          values[index] = value;
          if (--length == 0) {
            resolve(values);
          }
        }, reject);
      });
    });
  }

  static race(promises) {
    return new SyncPromise((resolve, reject) => {
      for (let i = 0; i < promises.length; i++) {
        SyncPromise.resolve(promises[i]).then(resolve, reject);
      }
    });
  }
}

function PromiseState(action) {
  return function(value, onFulfilled, onRejected, deferred) {
    if (!deferred) {
      deferred = Deferred();
    }
    action(value, onFulfilled, onRejected, deferred);
    return deferred.promise;
  }
}

const FulfilledPromise = PromiseState((value, onFulfilled, _, deferred) => {
  tryCatchDeferred(deferred, onFulfilled, value);
});

const RejectedPromise = PromiseState((reason, _, onRejected, deferred) => {
  tryCatchDeferred(deferred, onRejected, reason);
});

const PendingPromise = PromiseState((queue, onFulfilled, onRejected, deferred) => {
  queue.push({ deferred, onFulfilled, onRejected });
});

function Deferred() {
  const deferred = {};
  deferred.promise = new SyncPromise((resolve, reject) => {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
}

function adopt(promise, state, value) {
  const queue = promise.value_;
  promise.state_ = state;
  promise.value_ = value;

  for (let i = 0; i < queue.length; i++) {
    const { onFulfilled, onRejected, deferred } = queue[i];
    state(value, onFulfilled, onRejected, deferred);
  }
}

function adopter(promise, state) {
  return (value) => adopt(promise, state, value);
}

function noop() {}

function returner(x) {
  return x;
}

function thrower(x) {
  throw x;
}

function isFunction(fn) {
  return typeof fn == 'function';
}

function isObject(obj) {
  return obj == Object(obj);
}

function each(collection, iterator) {
  for (let i = 0; i < collection.length; i++) {
    iterator(collection[i], i);
  }
}

function tryCatchDeferred(deferred, fn, arg) {
  const { promise, resolve, reject } = deferred;
  try {
    const result = fn(arg);
    doResolve(promise, resolve, reject, result, result);
  } catch (e) {
    reject(e);
  }
}

function doResolve(promise, resolve, reject, value, context) {
  let called = false;
  try {
    if (value == promise) {
      throw new TypeError('Cannot fulfill promise with itself');
    }
    let then;
    if (isObject(value) && (then = value.then) && isFunction(then)) {
      then.call(context, (value) => {
        if (!called) {
          called = true;
          doResolve(promise, resolve, reject, value, value);
        }
      }, (reason) => {
        if (!called) {
          called = true;
          reject(reason);
        }
      });
    } else {
      resolve(value);
    }
  } catch (reason) {
    if (!called) {
      called = true;
      reject(reason);
    }
  }
}