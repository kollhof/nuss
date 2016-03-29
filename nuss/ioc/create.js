import {setContext} from './context';

const CALLABLES = new WeakMap();


export function callable(proto, name, descr) {
    CALLABLES.set(proto, descr.value);
}


export function create(cls, args=[], ctx) {
    let Class = class extends cls {
        constructor() {
            super(...args);
        }
    };

    setContext(Class.prototype, ctx);
    // TODO: overwrite or not?
    Class.prototype.constructor = cls;
    let obj = new Class();

    let func = CALLABLES.get(cls.prototype);

    if (func !== undefined) {
        obj = func.bind(obj);
    }
    return obj;
}
