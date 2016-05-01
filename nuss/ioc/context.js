
// TODO: use WeakMap
const CONTEXT = Symbol('context');
const WORKER_CONTEXT = Symbol('worker-context');

export function setContext(obj, ctx) {
    obj[CONTEXT] = ctx;
}

export function getContext(obj) {
    return obj === undefined ? undefined : obj[CONTEXT];
}


export function* getContexts(obj) {
    let ctx = getContext(obj);

    while (ctx !== undefined) {
        yield ctx;
        ctx = getContext(ctx.target);
    }
}


export function setWorkerContext(wrk, wrkCtx) {
    wrk[WORKER_CONTEXT] = wrkCtx;
    return wrkCtx;
}

export function getWorkerContext(wrk) {
    return wrk[WORKER_CONTEXT];
}


export function getDecoratedMethodContext(obj) {
    let ctx = getContext(obj);

    while (ctx !== undefined) {
        if (ctx.decoration.decoratedMethod !== undefined) {
            return ctx;
        }

        ctx = getContext(ctx.target);
    }
}
