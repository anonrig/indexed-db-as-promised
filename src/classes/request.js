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

import SyncPromise from './sync-promise';
import { resolveWithResult, rejectWithError } from '../util';

/**
 * A wrapper around IDBRequest to give it a Promise-like API.
 */
export default class Request {
  /**
   * @param {!IDBRequest} request
   * @param {Transaction=} transaction The wrapped IDBTransaction that issued
   *     this request.
   * @param {!Cursor|!Index|!ObjectStore} source A source that opened this
   *     cursor, either a wrapped IDBCursor, a wrapped IDBObjectStore, or a
   *     wrapped IDBIndex.
   * @template T
   */
  constructor(request, transaction = null, source = null) {
    /** @const */
    this._request = request;

    /** @const */
    this.transaction = transaction;

    /** @const */
    this.source = source;

    /**
     * The current state of the request.
     * @see https://www.w3.org/TR/IndexedDB/#idl-def-IDBRequestReadyState
     *
     * @type {!IDBRequestReadyState}
     */
    this.readyState = request.readyState;

    /**
     * A Promise like that will resolve once the request finishes.
     *
     * @const
     * @type {!SyncPromise<T>}
     */
    this._promise = new SyncPromise((resolve, reject) => {
      if (request.readyState === 'done') {
        if (request.error) {
          reject(request.error);
        } else {
          resolve(request.result);
        }
      } else {
        request.onsuccess = resolveWithResult(resolve);
        request.onerror = rejectWithError(reject);
      }
    });

    const updateReadyState = () => {
      this.readyState = request.readyState;
    };
    this._promise.then(updateReadyState, updateReadyState);
  }

  /**
   * Creates a new Promise-like that will transition into the state returned by
   * `onRejected` if this request fails.
   *
   * @param {function(T):R} onRejected
   * @return {SyncPromise<R>} A Promise-like
   * @template R
   */
  catch(onRejected) {
    return this._promise.catch(onRejected);
  }

  /**
   * Creates a new Promise-like that will transition into the state returned by
   * `onFulfilled` if this request succeedes, or `onRejected` if this request
   * fails.
   *
   * @param {function(T):S} onFulfilled
   * @param {function(T):R} onRejected
   * @return {SyncPromise<S>} A Promise-like
   * @template S
   * @template R
   */
  then(onFulfilled, onRejected) {
    return this._promise.then(onFulfilled, onRejected);
  }
}
