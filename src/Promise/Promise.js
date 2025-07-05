const PENDING = "pending";
const FULFILLED = "fulfilled";
const REJECTED = "rejected";

export class Promise extends Object {

    // Internal state
    #state = PENDING; // "pending" | "fulfilled" | "rejected"
    #value = undefined; // value when fulfilled
    #reason = undefined; // reason when rejected
    #isHandled = false;
    #fulfillmentHandlers = []; // array of functions to call when fulfilled
    #rejectionHandlers = []; // array of functions to call when rejected

    // static properties
    static get [Symbol.species]() {
        return this;
    }

    /*
        Constructor
        executor: function(resolve, reject) { ... }  ex: Promise((resolve, reject) => {
    */
    constructor(executor) {
        super();
        
        if (typeof executor !== 'function') {
            throw new TypeError("Promise resolver is not a function, ya feel me?");
        }
        
        // Call the executor function with resolve and reject
        
        const resolve = (value) => {
            if (this.#state === PENDING) {
                // recursion protection
                if (value === this) {
                    reject(new TypeError('Chaining cycle detected'));
                    return;
                }
                // if value is thenable follow its state
                if (value != null && typeof value.then === 'function') {
                    try {
                        value.then(resolve, reject);
                    } catch (error) {
                        reject(error);
                    }
                    return;
                }

                this.#state = FULFILLED;
                this.#value = value;
                // execute handlers asynchronously
                queueMicrotask(() => {
                    this.#fulfillmentHandlers.forEach(handler => handler(value));
                });
            }
            
        }
        const reject = (reason) => {
            if (this.#state === PENDING) {
                this.#state = REJECTED;
                this.#reason = reason;
                // execute handlers asynchronously

                // track unhandled rejection
                this.#isHandled = false;
                queueMicrotask(() => {
                    queueMicrotask(() => {
                        if (!this.#isHandled) {
                            console.warn('Unhandled Promise rejection:', reason)
                        }
                    });
                });
                

                queueMicrotask(() => {
                    this.#rejectionHandlers.forEach(handler => handler(reason));
                });
            }
        }   
            
        try {
            executor(resolve, reject);
        } catch (error) {
            reject(error);
        }
        
    }

    get state() {
        return this.#state;
    }

    /*
        then (onFulfilled, onRejected)
        @param - onFulfilled: function(value) { ... } - called when promise is fulfilled
        @param - onRejected: function(reason) { ... } - called when promise is rejected
        return -  a new Promise that resolves to the return value of the called function.
    */
    then (onFulfilled, onRejected=null) {
        // Accept two optional functions as arguments - onFulfilled and onRejected
        // return a new Promise that resolves to the return value of the called function
        // handle promise chaining
        // execute callbacks asynchronously
        if (typeof onRejected === 'function') {
            this.#isHandled = true;
        }
        return new Promise((resolve, reject) => {
            const handleFulfillment = (value) => {
                if (typeof onFulfilled !== 'function') {
                    resolve(value);
                    return;
                }

                try {
                    const result = onFulfilled(value);

                    // check if result is thenable
                    if (result != null && typeof result.then === 'function') {
                        // if theanable, follow its state
                        result.then(resolve, reject);
                    } else {
                        // otherwise, resolve with the value
                        resolve(result);
                    }
                } catch (error) {
                    reject(error);
                }
            };

            const handleRejection = (reason) => {
                if (typeof onRejected !== 'function') {
                    reject(reason);
                    return;
                }

                try {
                    const result = onRejected(reason);

                    // even rejection handlers can return thenables
                    if (result != null && typeof result.then === 'function') {
                        result.then(resolve, reject);
                    } else {
                        resolve(result); // Note: resolve, not reject
                    }
                } catch (error) {
                    reject(error);
                }
            };

            // handle based on current state
            if (this.#state === FULFILLED) {
                queueMicrotask(() => handleFulfillment(this.#value));
            } else if (this.#state === REJECTED) {
                queueMicrotask(() => handleRejection(this.#reason));
            } else {
                // still pending, add to handler arrays
                this.#fulfillmentHandlers.push(handleFulfillment);
                this.#rejectionHandlers.push(handleRejection);
            }
        });
    }

    catch (onRejected) {
        return this.then(null, onRejected);
    }

    finally (onFinally) {
        return this.then((value) => {
            onFinally();
            return value; // return the fulfilled value
        },(reason) => {
            onFinally();
            throw reason; // rethrow the rejection reason
        })
    }



    /*
        Static methods
    */
    static all (promises) {
        if (promises.length === 0) {
            return new Promise((resolve) => {
                resolve([]);
            });
        }
        // take in iterable of promises => return Promise when all input's promises fulfill, or reject
        return new Promise((resolve, reject) => {
            let result = new Array(promises.length);
            let resolvedCount = 0;

            for (let i=0; i < promises.length; i++) {
                promises[i].then(
                    (value) => {
                        result[i] = value;
                        resolvedCount++;
                        if (resolvedCount === promises.length) {
                            resolve(result);
                        }
                    },
                    (reason) => {
                        reject(reason);
                    }
                )
            }
        })

    }

    static allSettled (promises) {
        if (promises.length === 0) {
            return new Promise((resolve) => {
                resolve([]);
            });
        }
        return new Promise((resolve) => {
            let result = new Array(promises.length);
            let settledCount = 0;

            for (let i=0; i < promises.length; i++) {
                promises[i].then(
                    (value) => {
                        result[i] = { status: "fulfilled", value }
                        settledCount++;
                        if (settledCount === promises.length) {
                            resolve(result);
                        }
                    },
                    (reason) => {
                        result[i] = { status: "rejected", reason }
                        settledCount++;
                        if (settledCount === promises.length) {
                            resolve(result);
                        }
                    }
                )
            }
        })
    }

    static any (promises) {
        // returns when any promise fulfills, reject when all reject w/ AggregateError [rejection reasons]
        if (promises.length === 0) {
            return new Promise((_, reject) => {
                reject({
                    name: "AggregateError",
                    message: "All promises were rejected",
                    errors: []
                });
            });
        }

        return new Promise((resolve, reject) => {
            let aggregateError = {
                name: "AggregateError",
                message: "All promises were rejected",
                errors: new Array(promises.length)
            }
            let rejectedCount = 0;

            for (let i=0; i < promises.length; i++) {
                promises[i].then(
                    (value) => {
                        resolve(value);
                    },
                    (reason) => {
                        aggregateError.errors[i] = reason;
                        rejectedCount++;
                        if (rejectedCount === promises.length) {
                            reject(aggregateError);
                        }
                    }
                )

            }
        })
    }

    static race (promises) {
        // settle state with first promise that settles
        if (promises.length === 0) {
            return new Promise(() => {
            })
        }
        return new Promise((resolve, reject) => {
            for (let i=0; i < promises.length; i++) {
                promises[i].then(resolve, reject);
            }
        });
    }

    static reject (reason) {
        return new Promise((_, reject) => {
            reject(reason);
        });
    }

    static resolve(value) {
        // if value is a thenable, returned promise follows that thenable adopting its state.
        if (value != null && typeof value.then === 'function') {
            return new Promise((resolve, reject) => {
                value.then(resolve, reject);
            });
        } else {
            return new Promise((resolve) => {
                resolve(value);
            });
        }
    }

    static try(func, ...args) {
        try {
            let value = func(...args);
            if (value != null && typeof value.then === 'function') {
                return new Promise((resolve, reject) => {
                    value.then(resolve, reject);
                });
            } else {
                return new Promise((resolve) => {
                    resolve(value);
                });
            }
            
        } catch (error) {
            return new Promise((_,reject) => {
                reject(error);
            });
        }
    }

    static withResolvers() {
        let resolve, reject;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        return {
            promise: promise,
            resolve, 
            reject
        }
    }

}