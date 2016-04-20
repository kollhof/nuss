import {dependencyDecorator} from './ioc/decorators';
import {callable, factory} from './ioc/create';
import {getContext} from './ioc/context';
import {shortid} from './uuid';
import {createHandler} from './ioc/resolve';
import {logger} from './logging';


export function getHandlerContext(obj) {
    let ctx = getContext(obj) || {target: obj};

    while (ctx !== undefined) {
        if (ctx.decoration.decoratedMethod !== undefined) {
            return ctx;
        }

        ctx = getContext(ctx.target);
    }
}


export class Handler {
    @logger
    log

    @factory
    getHandler({target}) {
        let log = this.log.timeit();

        let ctx = getHandlerContext(target);

        // TODO: required if testing method decorators without
        // using createMocked()
        // if (ctx === undefined) {
        //     return;
        // }

        log.debug`creating handler`;
        let hndlr = createHandler(ctx.decoration, target);
        log.debug`created handler in ${log.elapsed} ms`;

        return hndlr;
    }
}

export function handler(proto, name, descr) {
    return dependencyDecorator(handler, {
        dependencyClass: Handler
    })(proto, name, descr);
}


export class Worker {
    @handler
    handle

    @callable
    invokeHandler(...args) {
        return this.handle(...args);
    }
}

export function worker(wokerClassOrProto, name, descr) {
    if (name === undefined && descr === undefined) {
        return dependencyDecorator(worker, {
            dependencyClass: wokerClassOrProto,
            config: [{key: 'worker', optional: true}]
        });
    }
    return worker(Worker)(wokerClassOrProto, name, descr);
}


function findWorker(ctx) {
    while (ctx !== undefined) {
        if (ctx.decoration.decorator === worker) {
            return ctx.target;
        }

        ctx = getContext(ctx.target);
    }
}


const WORKER_CONTEXT = Symbol('worker-context');

export function setWorkerContext(wrk, wrkCtx) {
    wrk[WORKER_CONTEXT] = wrkCtx;
    return wrkCtx;
}

export function getWorkerContext(wrk) {
    return wrk[WORKER_CONTEXT];
}


export class WorkerContext {
    id=shortid()

    headers={}

    constructor() {
        this.setHeader('trace', this.id);
    }

    setHeader(key, value) {
        if (value !== undefined) {
            this.headers[key] = value;
        }
    }

    getHeader(key) {
        return this.headers[key];
    }

    @factory
    getContextFromWorker(ctx) {
        let wrk = findWorker(ctx);
        let wrkCtx = getWorkerContext(wrk);

        if (wrkCtx === undefined) {
            wrkCtx = setWorkerContext(wrk, this);
        }
        return wrkCtx;
    }
}

export function workerContext(proto, name, descr) {
    return dependencyDecorator(workerContext, {
        dependencyClass: WorkerContext
    })(proto, name, descr);
}
