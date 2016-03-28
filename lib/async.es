
export class SomeRejected extends Error {

    constructor(errors) {
        super('SomeRejected');
        this.errors = errors;
    }
}

/**
 * Returns a `Promise` which will resolve after `duration` milliseconds.
 *
 * An `await sleep(...)` will essentially make the calling async function
 * appear to pause for the given `duration`.
 *
 * Use `await defer()` rather than `await sleep(0)`,
 * if you want to yield code execution.
 *
 * Example:
 * ```
 * async function foobar() {
 *     console.log('pausing');
 *     await sleep(5000);
 *     console.log('done');
 * }
 * foobar();
 * ```
 */
export async function sleep(duration) {
    await  new Promise((resolve)=> {
        setTimeout(resolve, duration);
    });
}

/**
 * Returns a `Promise` for the eventual result of running the `taskFunction`.
 *
 * An `await defer();` may be used to pause the current async function,
 * yielding code execution to any other async functions currently
 * awaiting results.
 *
 * Example:
 * ```
 * async function task(name, items) {
 *     console.log(name, 'started');
 *
 *     for(let item of items){
 *         await defer();
 *         console.log(name, item);
 *     }
 *
 *     console.log(name, 'done');
 * }
 *
 * async function spam() {
 *     let task1 = defer(()=> task('t1', '123456789'));
 *     let task2 = defer(()=> task('t2', 'abcdefghi'));
 *
 *     console.log('');
 *
 *     await all([task1, task2]);
 *
 *     console.log('...spam');
 * }
 *
 * spam();
 * ```
 */
export async function defer(taskFunction) {
    // await null;
    // if (taskFunction !== undefined) {
    //     return await taskFunction();
    // }
    return await Promise.resolve().then(taskFunction);
}

/**
 * Waits for all `promises` to be settled,
 * no matter if they are resolved or rejected.
 *
 * A `SomeRejected` error will be thrown
 * if any of the settled `promises` were rejected.
 */
export async function all(promises) {
    let errors = [];
    let results = [];

    for (let promise of promises) {
        try {
            results.push(await promise);
        } catch (err) {
            errors.push(err);
        }
    }

    if (errors.length) {
        throw new SomeRejected(errors);
    } else {
        return results;
    }
}


/* global setTimeout:true */
/* global Promise:true */

export class Event {
    constructor() {
        this._promise = new Promise((resolve)=> {
            this._resolve = resolve;
        });
    }

    signal(result) {
        this._resolve(result);
    }

    then(...args) {
        return this._promise.then(...args);
    }
}


export class TaskSet extends Set {
    constructor() {
        super();
        //this.tasks = new Set();
    }

    spawn(taskFunction) {
        let task = defer(taskFunction);

        this.add(task);

        return task
            .then((result)=> {
                this.delete(task);
                return result;
            })
            .catch((err)=> {
                this.delete(task);
                throw err;
            });
    }

    // get size() {
    //     return this.tasks.size;
    // }

    // [Symbol.iterator]() {
    //     return this.tasks[Symbol.iterator]();
    // }
}
