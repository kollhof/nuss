import {getContexts} from '../ioc/context';
import {last} from '../iter';
import {DefaultWeakMap} from '../default-maps';

export const SHARED = new DefaultWeakMap(()=> new WeakMap());

export function shared(Class) {
    return (proto, name, descr)=> {
        descr.initializer = function() {
            let ctx = last(getContexts(this));
            let store = SHARED.get(ctx.target);

            let key = proto.constructor;
            let obj = store.get(key);

            if (obj === undefined) {
                obj = new Class();
                store.set(key, obj);
            }

            return obj;
        };
    };
}
