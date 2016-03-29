import {DefaultWeakMap} from '../default-maps';
import {create} from './create';
import {getContext, InjectionContext} from './context';

const CONTEXT_HANDLERS = new DefaultWeakMap(()=> new Map());


function createFromDescr({dependencyClass, constructorArgs}, ctx) {
    return create(dependencyClass, constructorArgs, ctx);
}


export function handle(decorator) {
    return (proto, name, descr)=> {
        CONTEXT_HANDLERS.get(proto).set(decorator, descr.value);
    };
}

export function findContextMethod(decorator, target) {
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

export function resolveImplementationDescriptor(decoration, target) {
    let resolve = findContextMethod(resolveImplementationDescriptor, target);
    let descr = decoration.decoratorDescr;

    if (resolve !== undefined) {
        descr = resolve(decoration, target) || descr;
    }

    return descr;
}

export function resolveImplementationCtxDescriptor(decoration, target) {
    let resolve = findContextMethod(resolveImplementationCtxDescriptor, target);
    let descr = {
        dependencyClass: InjectionContext,
        constructorArgs: [decoration]
    };

    if (resolve !== undefined) {
        descr = resolve(decoration, target) || descr;
    }

    return descr;
}

export function resolveImpementation(decoration, target) {
    let getImpl = findContextMethod(resolveImpementation, target);

    if (getImpl) {
        return getImpl(decoration, target);
    }

    let ctxDescr = resolveImplementationCtxDescriptor(decoration, target);
    let ctx = createFromDescr(ctxDescr, target);
    let descr = resolveImplementationDescriptor(decoration, ctx);

    return createFromDescr(descr, ctx);
}
