import {DefaultWeakMap} from '../default-maps';
import {findContextMethod, setContext, InjectionContext} from './context';

const DECORATED_METHODS = new DefaultWeakMap(()=> []);
const DECORATOR_DESCRIPTORS = new WeakMap();
const CALLABLES = new WeakMap();

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

function createFromDescr({dependencyClass, constructorArgs}, ctx) {
    return create(dependencyClass, constructorArgs, ctx);
}

export function resolveImplementationDescriptor(decoration, target) {
    let resolve = findContextMethod(resolveImplementationDescriptor, target);
    let descr = decoration.decoratorDescr;

    if (resolve !== undefined) {
        descr = resolve(decoration, target) || descr;
    }

    return descr;
}

export function resolveInjectionContextDescriptor(decoration, target) {
    let resolve = findContextMethod(resolveInjectionContextDescriptor, target);
    let descr = {
        dependencyClass: InjectionContext,
        constructorArgs: [decoration]
    };

    if (resolve !== undefined) {
        descr = resolve(decoration, target) || descr;
    }

    return descr;
}


export function createInjection(decoration, target) {
    let getImpl = findContextMethod(createInjection, target);

    if (getImpl) {
        return getImpl(decoration, target);
    }

    let ctxDescr = resolveInjectionContextDescriptor(decoration, target);
    let ctx = createFromDescr(ctxDescr, target);
    let descr = resolveImplementationDescriptor(decoration, ctx);

    return createFromDescr(descr, ctx);
}


export function callable(proto, name, descr) {
    CALLABLES.set(proto, descr.value);
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
                obj = createInjection(decoration, this);

                if (sharingKey !== undefined) {
                    store.set(key, obj);
                }
            }
            return obj;
        };
        return descr;
    };
}

