import {dependencyDecorator} from './ioc/decorators';
import {callable, factory} from './ioc/create';
import {getContext, getWorkerContext, setWorkerContext} from './ioc/context';
import {handler} from './handler';
import {shortid} from './uuid';


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

// TODO: could be a findImplFor(ctx, worker)
function findWorker(ctx) {
    let wrk = ctx.target;

    while (ctx !== undefined && ctx.decoration !== undefined) {
        if (ctx.decoration.decorator === worker) {
            break;
        }
        wrk = ctx.target;
        ctx = getContext(wrk);
    }

    return wrk;
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
        // TODO: this finds the target of a worker, not the worker
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
