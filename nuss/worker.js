import {findDecoratedMethod, handle} from './ioc/resolve';
import {callable} from './ioc/create';
import {getContext, Context} from './ioc/context';

export class WorkerContext extends Context {
    headers = {};

    constructor() {
        super();
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

    get name() {
        let parent = getContext(this);

        return `${parent.name}<${this.id}>`;
    }

    @handle(workerContext)
    getContext() {
        return this;
    }
}

export class AutoWorker {
    constructor(...args) {
        this.args = args;
    }

    @callable
    work(handler) {
        return handler(...this.args);
    }
}


export function workerContext(proto, name, descr) {
    descr.initializer = function() {
        let getWorkerCtx = findDecoratedMethod(workerContext, this);
        return getWorkerCtx ? getWorkerCtx() : undefined;
    };
    return descr;
}


export function spawn(proto, name, descr) {
    descr.initializer = function() {
        let spawnTask = findDecoratedMethod(spawn, this);
        return spawnTask;
    };
    return descr;
}

function spawnWorkerDecorator(decorator, wokerClass) {
    return (proto, name, descr)=> {
        descr.initializer = function() {
            let spawnWrk = findDecoratedMethod(decorator, this)
                .bind(null, this, wokerClass);
            return spawnWrk;
        };
        return descr;
    };
}

export function spawnWorker(wokerClassOrProto, name, descr) {
    if (name === undefined && descr === undefined) {
        return spawnWorkerDecorator(spawnWorker, wokerClassOrProto);
    }
    return spawnWorker(AutoWorker)(wokerClassOrProto, name, descr);
}
