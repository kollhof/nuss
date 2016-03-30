import {DefaultWeakMap} from '../default-maps';
import {create} from './create';
import {getContext, InjectionContext, InvokerContext} from './context';

const CONTEXT_HANDLERS = new DefaultWeakMap(()=> new Map());


function createFromDescr({dependencyClass, constructorArgs}, ctx) {
    return create(dependencyClass, constructorArgs, ctx);
}


export function createBoundDecoratedMethod(decoration, ctx) {
    let {decoratedClass, decoratedMethod} = decoration;
    let obj = create(decoratedClass, [], ctx);
    return decoratedMethod.bind(obj);
}


export function handle(decorator) {
    return (proto, name, descr)=> {
        CONTEXT_HANDLERS.get(proto).set(decorator, descr.value);
    };
}

export function findDecoratedMethod(decorator, target) {
    let ctx = getContext(target) || target;

    while (ctx) {
        // Object.getPrototypeOf(ctx);
        let proto = ctx.constructor.prototype;

        let func = CONTEXT_HANDLERS
            .get(proto)
            .get(decorator);

        if (func !== undefined) {
            return func.bind(ctx);
        }
        ctx = getContext(ctx);
    }
}

export function resolveImplementationCtxDescriptor(decoration, target) {
    let resolve = findDecoratedMethod(
        resolveImplementationCtxDescriptor, target);
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

export function resolveImplementationDescriptor(decoration, target) {
    let resolve = findDecoratedMethod(resolveImplementationDescriptor, target);
    let descr = decoration.decoratorDescr;

    if (resolve !== undefined) {
        descr = resolve(decoration, target) || descr;
    }

    return descr;
}

export function resolveImpementation(decoration, target) {
    let getImpl = findDecoratedMethod(resolveImpementation, target);

    if (getImpl !== undefined) {
        // TODO: allow default behaviour if result is undefined ?
        return getImpl(decoration, target);
    }

    let ctxDescr = resolveImplementationCtxDescriptor(decoration, target);
    let ctx = createFromDescr(ctxDescr, target);
    let descr = resolveImplementationDescriptor(decoration, ctx);

    return createFromDescr(descr, ctx);
}
