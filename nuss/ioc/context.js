// TODO: use WeakMap
const CONTEXT = Symbol('context');


export function setContext(obj, ctx) {
    obj[CONTEXT] = ctx;
}

export function getContext(obj) {
    return obj === undefined ? undefined : obj[CONTEXT];
}


export function* getContexts(obj) {
    let ctx = getContext(obj) || {target: obj};

    while (ctx !== undefined) {
        yield ctx;
        ctx = getContext(ctx.target);
    }
}

export function getContextDescr(ctx) {
    let {decoration, target} = ctx;

    if (decoration !== undefined) {
        let {decorator, decoratedClass, decoratedName} = decoration;

        return {
            ctx: target.constructor.name,
            cls: decoratedClass.name,
            nme: decoratedName,
            dec: decorator.name,
            id: target.id
        };
    }

    return {
        ctx: `${target.constructor.name}`,
        id: target.id
    };
}
