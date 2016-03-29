import {all, TaskSet} from './async';
import {logger} from './ctxlogger';
import {getDecoratedMethods} from './ioc/decorators';
import {
    resolveImpementation, resolveImplementationDescriptor,
    resolveImplementationCtxDescriptor,
    findContextMethod
} from './ioc/resolve';
import {create} from './ioc/create';
import {getContext, Context} from './ioc/context';
import {handle} from './ioc/resolve';
import {config} from './config';


export function spawnWorker(proto, name, descr) {
    descr.initializer = function() {
        let spawnWrkr = findContextMethod(spawnWorker, this);

        return (...args)=> spawnWrkr(this, ...args);
    };
    return descr;
}

export function spawn(proto, name, descr) {
    descr.initializer = function() {
        let spawnTask = findContextMethod(spawn, this);

        return spawnTask;
    };
    return descr;
}

export function workerContext(proto, name, descr) {
    descr.initializer = function() {
        let getWorkerCtx = findContextMethod(workerContext, this);

        return getWorkerCtx ? getWorkerCtx() : undefined;
    };
    return descr;
}

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

export class InvokerContext extends Context {
    constructor(decoration) {
        super();
        this.decoration = decoration;
    }

    get name() {
        let {decoratedClass, decoratedMethod, decorator} = this.decoration;
        let clsName = decoratedClass.name;
        let handlerName = decoratedMethod.name;
        let decoratorName = decorator.name;

        return `${clsName}.${handlerName}@${decoratorName}`;
    }
}


export class Container {
    @logger
    log

    constructor(ServiceClass, configData) {
        this.ServiceClass = ServiceClass;
        this.config = configData;
        this.entrypoints = [];
        this.activeTasks = new TaskSet();
    }

    createEntrypoints() {
        let {log, entrypoints, ServiceClass} = this;

        log = log.timeit();
        log.debug`creating entrypoints`;

        for (let descr of getDecoratedMethods(ServiceClass)) {
            log.debug`creating entrypoint for ${descr.decorator}`;
            let ep = resolveImpementation(descr, this);

            entrypoints.push(ep);
        }
        log.debug`all entrypoints created in ${log.elapsed} ms`;
    }

    async start() {
        let log = this.log.timeit();

        log.debug`starting container`;

        this.createEntrypoints();
        await this.startEntryPoints();

        log.debug`container started in ${log.elapsed} ms`;
    }

    async startEntryPoints() {
        let {log, entrypoints} = this;
        let starting = [];

        log = log.timeit();
        log.debug`starting entrypoints`;

        for (let ep of entrypoints) {
            let task = ep.start();

            starting.push(task);
        }

        log.debug`waiting for all entrypoints to have started`;
        await all(starting);

        log.debug`all entrypoints started in ${log.elapsed} ms`;
    }

    async stop() {
        let log = this.log.timeit();

        log.debug`stopping container`;
        await this.stopEntrypoints();
        await this.stopActiveTasks();

        log.debug`container stopped in ${log.elapsed} ms`;
    }

    async stopEntrypoints() {
        let {log, entrypoints} = this;

        log = log.timeit();

        log.debug`stopping entrypoints`;
        const stopping = [];

        for (const ep of entrypoints) {
            stopping.push(ep.stop());
        }

        log.debug`wating for ${stopping.length} EPs to stop`;
        try {
            await all(stopping);
        } catch (err) {
            log.error`stopping EPs ${err}`;
        }

        log.debug`all EPs stopped in ${log.elapsed} ms`;
    }

    async stopActiveTasks() {
        let {activeTasks, log} = this;

        log = log.timeit();

        log.debug`wating for ${activeTasks.size} tasks to stop`;
        try {
            await all(activeTasks);
        } catch (err) {
            log.error`not all tasks stopped: ${err.errors}`;
        }
        log.debug`all tasks stopped in ${log.elapsed} ms`;
    }

    @handle(spawn)
    spawn(taskFunction) {
        return this.activeTasks.spawn(taskFunction);
    }

    async runWorker(ep, workerFunc) {
        let log = this.log.timeit();
        let epCtx = getContext(ep);

        log.debug`creating worker ctx for ${epCtx.name}`;
        let workerCtx = create(WorkerContext, [], epCtx);
        let {decoratedClass, decoratedMethod} = epCtx.decoration;

        log.debug`creating worker for ${workerCtx.name}`;
        let worker = create(decoratedClass, [], workerCtx);
        let handler = decoratedMethod.bind(worker);
        log.debug`worker creatd in ${log.elapsed} ms`;

        log.debug`invoking worker ${workerCtx.name}`;
        await workerFunc(handler, workerCtx);

        log.debug`worker ${workerCtx.name} completed in ${log.elapsed} ms`;
    }

    @handle(spawnWorker)
    spawnWorker(ep, workerFunc) {
        this.log.debug`spawning worker for ${getContext(ep)}`;
        return this.spawn(()=> this.runWorker(ep, workerFunc));
    }

    @handle(resolveImplementationDescriptor)
    resolveImplementationDescriptor(decoration) {
        this.log.debug`resolving dependency class for ${decoration.decorator}`;
    }

    @handle(resolveImplementationCtxDescriptor)
    resolveImplementationCtxDescriptor(decoration) {
        this.log.debug`resolving ctx class for ${decoration.decorator}`;

        if (decoration.decoratedMethod) {
            return {
                dependencyClass: InvokerContext,
                constructorArgs: [decoration]
            };
        }
    }

    @handle(config)
    getConfig(key, obj) {
        this.log.debug`resolving config ${key}`;
        let ctx = getContext(obj);
        let ctxs = [];

        while (ctx) {
            let {decoration} = ctx || {};
            let {decorator} = decoration || {};
            let {name} = decorator || {};

            if (name !== undefined) {
                ctxs.unshift(name);
            }

            ctx = getContext(ctx);
        }

        let conf = {default: this.config};
        ctxs.unshift('default');

        for (let name of ctxs) {
            conf = conf[name];

            if (conf === undefined) {
                break;
            } else {
                let val = conf[key];

                if (val !== undefined) {
                    return val;
                }
            }
        }
    }
}
