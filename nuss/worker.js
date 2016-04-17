import {provide} from './ioc/resolve';
import {dependencyDecorator} from './ioc/decorators';
import {callable} from './ioc/create';
import {shortid} from './uuid';


export class WorkerContext {
    id = shortid()

    headers = {}

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


export function worker(wokerClassOrProto, name, descr) {
    if (name === undefined && descr === undefined) {
        return dependencyDecorator(worker, {
            dependencyClass: wokerClassOrProto,
            config: [{key: 'worker', optional: true}]
        });
    }
    return worker(AutoWorker)(wokerClassOrProto, name, descr);
}
