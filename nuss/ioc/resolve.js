import {DefaultWeakMap} from '../default-maps';
import {create} from './create';
import {getContext, InjectionContext, InvokerContext} from './context';

const IMPLEMENTATION_PROVIDERS = new DefaultWeakMap(()=> new Map());


function createFromDescr({dependencyClass, constructorArgs}, ctx) {
    return create(dependencyClass, constructorArgs, ctx);
}


export function createdDecoratedHandler(decoration, ctx) {
    let {decoratedClass, decoratedMethod} = decoration;
    let obj = create(decoratedClass, [], ctx);
    return decoratedMethod.bind(obj);
}


export function provide(decorator) {
    return (proto, name, descr)=> {
        IMPLEMENTATION_PROVIDERS.get(proto).set(decorator, descr.value);
    };
}

export function findProvider(decorator, target) {
    let ctx = getContext(target) || target;

    while (ctx) {
        // Object.getPrototypeOf(ctx);
        let proto = ctx.constructor.prototype;

        let func = IMPLEMENTATION_PROVIDERS
            .get(proto)
            .get(decorator);

        if (func !== undefined) {
            return func.bind(ctx);
        }
        ctx = getContext(ctx);
    }
}

export function getImplementationCtxDescriptor(decoration, target) {
    let resolve = findProvider(getImplementationCtxDescriptor, target);
    let defaultClass = InjectionContext;

    if (decoration.decoratedMethod) {
        defaultClass = InvokerContext;
    }

    let descr = {
        dependencyClass: defaultClass,
        constructorArgs: [decoration]
    };

    if (resolve !== undefined) {
        descr = resolve(decoration, target) || descr;
    }

    return descr;
}


function getImplementationFromProvider(decoration, target) {
    for (let decorator of [decoration.decorator, getImplementation]) {

        let getImpl = findProvider(decorator, target);

        if (getImpl !== undefined) {
            let obj = getImpl(decoration, target);
            if (obj !== undefined) {
                return obj;
            }
        }
    }
}

export function getImplementation(decoration, target) {
    let obj = getImplementationFromProvider(decoration, target);
    if (obj !== undefined) {
        return obj;
    }

    let {decoratorDescr} = decoration;

    let ctxDescr = getImplementationCtxDescriptor(decoration, target);
    let ctx = createFromDescr(ctxDescr, getContext(target) || target);
    return createFromDescr(decoratorDescr, ctx);
}

