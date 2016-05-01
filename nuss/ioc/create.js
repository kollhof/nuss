import {setContext} from './context';
import {DefaultWeakMap} from '../default-maps';

const SPECIALS = new DefaultWeakMap(()=> ({}));
const BOUND_INSTANCE = Symbol('callable-instance');

export function callable(proto, name, descr) {
    SPECIALS.get(proto).func = descr.value;
}

export function factory(proto, name, descr) {
    SPECIALS.get(proto).fac = descr.value;
}


// export function isCallable(cls) {
//     return SPECIALS.get(cls.prototype).func !== undefined;
// }

// export function isFactory(cls) {
//     return SPECIALS.get(cls.prototype).fac !== undefined;
// }

// export function getBoundObject(func) {
//     return func[BOUND_INSTANCE];
// }

export function bind(func, obj) {
    func = func.bind(obj);
    func[BOUND_INSTANCE] = obj;
    return func;
}

export function createInstance(cls, args, ctx) {
    let Class = class extends cls {
        constructor() {
            super(...args);
        }
    };

    setContext(Class.prototype, ctx);

    // TODO: overwrite or not?
    Class.prototype.constructor = cls;
    return new Class();
}

export function create(cls, args=[], ctx) {
    let obj = createInstance(cls, args, ctx);

    let {func, fac} = SPECIALS.get(cls.prototype);

    if (fac !== undefined) {
        obj = fac.call(obj, ctx); // eslint-disable-line prefer-reflect
    } else if (func !== undefined) {
        obj = bind(func, obj);

        // TODO: overwrite constructor property or even Object.setPrototypeOf?
        setContext(obj, ctx);
    }

    return obj;
}

