import {setContext} from './context';
import {DefaultWeakMap} from '../default-maps';

const SPECIALS = new DefaultWeakMap(()=> ({}));


export function callable(proto, name, descr) {
    SPECIALS.set(proto, {func: descr.value});
}

export function factory(proto, name, descr) {
    SPECIALS.set(proto, {fac: descr.value || descr.get});
}


export function isCallable(cls) {
    return SPECIALS.get(cls.prototype).func !== undefined;
}

export function isFactory(cls) {
    return SPECIALS.get(cls.prototype).fac !== undefined;
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

    if (func !== undefined) {
        return func.bind(obj);
    } else if (fac !== undefined) {
        return fac.call(obj); /* eslint prefer-reflect: 0 */
    }

    return obj;
}

