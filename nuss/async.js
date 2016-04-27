export class SomeRejected extends Error {
    constructor(errors) {
        super('SomeRejected');
        this.errors = errors;
    }
}

/**
 * Returns a `Promise` which will resolve after `duration` milliseconds.
 *
 * An `await sleep(...)` will make the calling async function
 * appear to pause for the given `duration`.
 *
 * Use `await TasksAndIO;` rather than `await sleep(0)`,
 * if you want to yield code execution so that IO and other tasks can be
 * processed.
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
export function sleep(duration) {
    return new Promise((resolve)=> {
        /* global setTimeout: true */
        setTimeout(resolve, duration);
    });
}


export const TasksAndIO = {
    then(resolve) {
        /* global setImmediate: true */
        setImmediate(resolve);
    }
};

/**
 * Returns a `Promise` for result of running the `taskFunction`.
 * ```
 *  defer(()=> task());
 *
 *  (async ()=> {
 *      await TasksAndIO;
 *      return task();
 *  })();
 * ```
 *
 * Example:
 * ```
 * async function task(name, items) {
 *     console.log(name, 'started');
 *
 *     for(let item of items){
 *         await TasksAndIO;
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
 *     console.log('spam...');
 *
 *     await all([task1, task2]);
 *
 *     console.log('...spam');
 * }
 *
 * spam();
 * ```
 */
export function defer(taskFunction) {
    let promise = new Promise((resolve)=> {
        /* global setImmediate: true */
        setImmediate(resolve);
    });

    return promise.then(taskFunction);
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


export class TaskSet extends Set {
    spawn(taskFunction) {
        let task = defer(taskFunction);

        this.add(task);
        return task;
    }

    add(task) {
        task.then((result)=> {
            this.delete(task);
            return result;
        })
        .catch((err)=> {
            this.delete(task);
            throw err;
        });

        return super.add(task);
    }
}


export function wrapNodeStyle(thisObj, func) {
    func = func.bind(thisObj);

    return (...args)=> new Promise((resolve, reject)=> {
        func(...args, (err, result)=> {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

const WRAPPED_FUNCS = new WeakSet();
const WRAPPED_OBJ_PROVIDER = new WeakMap();

export function isWrapped(func) {
    return WRAPPED_FUNCS.has(func);
}


export function wraps(wrapped) {
    return (cls)=> {
        // TODO: really use name to get the value in @wrap()?
        WRAPPED_OBJ_PROVIDER.set(cls.prototype, wrapped);
        return cls;
    };
}

export function wrap(proto, name, descr) {

    // TODO: does this conform to the spec?
    descr.value = function(...args) {
        let wrappedProvider = WRAPPED_OBJ_PROVIDER.get(proto);
        let wrappedObj = this[wrappedProvider];
        let func = wrapNodeStyle(wrappedObj, wrappedObj[name]);
        return func(...args);
    };

    WRAPPED_FUNCS.add(descr.value);

    delete descr.initializer; /* eslint prefer-reflect: 0 */
    return descr;
}
