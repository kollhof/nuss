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
