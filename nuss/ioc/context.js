
const CONTEXT = Symbol('context');


export function setContext(obj, ctx) {
    obj[CONTEXT] = ctx;
}

export function getContext(obj) {
    return obj[CONTEXT];
}


export class Context {
}

export class InjectionContext extends Context {
    constructor(decoration) {
        super();
        this.decoration = decoration;
    }
}

export class InvokerContext extends Context {
    constructor(decoration) {
        super();
        this.decoration = decoration;
    }
}

export function* getContexts(obj) {
    let ctx = obj;

    if (!(ctx instanceof Context)) {
        ctx = getContext(obj) || ctx;
    }

    while (ctx !== undefined) {
        yield ctx;
        ctx = getContext(ctx);
    }
}

export function getContextDescr(ctx) {
    let {decoration} = ctx;

    if (decoration !== undefined) {
        let {decorator, decoratedClass, decoratedName} = decoration;

        return {
            ctx: ctx.constructor.name,
            cls: decoratedClass.name,
            nme: decoratedName,
            dec: decorator.name
        };
    }

    return {
        ctx: ctx.constructor.name,
        id: ctx.id
    };
}
