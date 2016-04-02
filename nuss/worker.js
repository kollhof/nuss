import {provide} from './ioc/resolve';
import {dependencyDecorator} from './ioc/decorators';
import {callable} from './ioc/create';
import {Context} from './ioc/context';
import {shortid} from './uuid';


export class WorkerContext extends Context {
    id = shortid()

    headers = {}

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

    @provide(workerContext)
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
    return dependencyDecorator(workerContext, {
        dependencyClass: WorkerContext
    })(proto, name, descr);
}


export function spawn(proto, name, descr) {
    return dependencyDecorator(spawn, {})(proto, name, descr);
}


export function spawnWorker(wokerClassOrProto, name, descr) {
    if (name === undefined && descr === undefined) {
        return dependencyDecorator(spawnWorker, {
            dependencyClass: wokerClassOrProto
        });
    }
    return spawnWorker(AutoWorker)(wokerClassOrProto, name, descr);
}
