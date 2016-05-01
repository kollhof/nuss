
// TODO: use WeakMap
const CONTEXT = Symbol('context');
const WORKER_CONTEXT = Symbol('worker-context');

let tmpCreateContext = undefined; // eslint-disable-line no-undef-init

export function setTmpCreateContext(ctx) {
    tmpCreateContext = ctx;
}

export function setContext(obj, ctx) {
    obj[CONTEXT] = ctx;
}

export function getContext(obj) {
    if (obj !== undefined) {
        let ctx = obj[CONTEXT];
        if (ctx === undefined && tmpCreateContext !== undefined) {
            ctx = tmpCreateContext;
            tmpCreateContext = undefined;
            setContext(obj, ctx);
        }
        return ctx;
    }
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
