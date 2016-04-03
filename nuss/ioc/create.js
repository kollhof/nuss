import {setContext} from './context';
import {DefaultWeakMap} from '../default-maps';

const SPECIALS = new DefaultWeakMap(()=> ({}));


export function callable(proto, name, descr) {
    SPECIALS.set(proto, {func: descr.value});
}

export function value(proto, name, descr) {
    SPECIALS.set(proto, {val: descr.value || descr.get});
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

    let {func, val} = SPECIALS.get(cls.prototype);

    if (func !== undefined) {
        obj = func.bind(obj);
    } else if (val !== undefined) {
        obj = val.call(obj); /* eslint prefer-reflect: 0 */
    }
    return obj;
}
