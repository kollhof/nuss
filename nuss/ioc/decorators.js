import {DefaultWeakMap} from '../default-maps';
import {resolveImpementation} from './resolve';


const DECORATED_METHODS = new DefaultWeakMap(()=> []);
const DECORATOR_DESCRIPTORS = new WeakMap();


export function getDecoratorDescriptor(decorator) {
    return DECORATOR_DESCRIPTORS.get(decorator);
}

export function setDecoratorDescriptor(decorator, descriptor) {
    return DECORATOR_DESCRIPTORS.set(decorator, descriptor);
}

export function* getDecoratedMethods(cls) {
    let decoratorMethodDescr = DECORATED_METHODS.get(cls.prototype);

    for (let descr of decoratorMethodDescr) {
        yield descr;
    }
}

export function methodDecorator(decorator, decoratorDescr) {
    return (proto, name, descr)=> {
        let decoratedClass = proto.constructor;
        let decoratedMethod = descr.value;

        let decoration = {
            decorator,
            decoratorDescr,
            decoratedClass,
            decoratedMethod
        };

        DECORATED_METHODS
            .get(proto)
            .push(decoration);

        return descr;
    };
}


const SHARED = new DefaultWeakMap(()=> new Map());

export function dependencyDecorator(decorator, decoratorDescr) {
    return (proto, name, descr)=> {
        let decoratedClass = proto.constructor;
        let decoration = {
            decorator,
            decoratorDescr,
            decoratedClass
        };

        descr.initializer = function() {
            let sharingKey = decoratorDescr.sharingKey;
            let obj, key, store;

            if (sharingKey !== undefined) {
                key = sharingKey();
                store = SHARED.get(decorator);
                obj = store.get(key);
            }

            if (obj === undefined) {
                obj = resolveImpementation(decoration, this);

                if (sharingKey !== undefined) {
                    store.set(key, obj);
                }
            }
            return obj;
        };
        return descr;
    };
}

