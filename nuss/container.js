import {getDecoratedMethods} from './ioc/decorators';
import {
    resolveImpementation, resolveImplementationDescriptor,
    resolveImplementationCtxDescriptor,
    createBoundDecoratedMethod, handle
} from './ioc/resolve';
import {create} from './ioc/create';
import {getContext} from './ioc/context';
import {WorkerContext, spawn, spawnWorker} from './worker';
import {all, TaskSet} from './async';
import {logger} from './logging';
import {config} from './config';


function getProperty(obj, path) {
    let val = obj;

    for (let key of path.split('.')) {
        val = val[key];
        if (val === undefined) {
            break;
        }
    }
    return val;
}

function getPath(obj) {
    let ctx = getContext(obj);
    let names = [];

    while (ctx !== undefined) {
        let name = getProperty(ctx, 'decoration.decorator.name');

        if (name !== undefined) {
            names.unshift(name);
        }

        ctx = getContext(ctx);
    }
    return names;
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
            starting.push(ep.start());
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
        let stopping = [];

        log = log.timeit();

        log.debug`stopping entrypoints`;
        for (let ep of entrypoints) {
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

    async runWorker(ep, WorkerClass, workerArgs) {
        let log = this.log.timeit();
        let epCtx = getContext(ep);

        log.debug`creating worker for ${epCtx.name}`;
        let workerCtx = create(WorkerContext, [], epCtx);
        let workerFunc = create(WorkerClass, workerArgs, workerCtx);

        log.debug`creating handler for ${workerCtx.name}`;
        let handler = createBoundDecoratedMethod(epCtx.decoration, workerCtx);
        log.debug`handler created in ${log.elapsed} ms`;

        log.debug`invoking worker ${workerCtx.name}`;
        await workerFunc(handler);
        log.debug`worker ${workerCtx.name} completed in ${log.elapsed} ms`;
    }

    @handle(spawnWorker)
    spawnWorker(ep, WorkerClass, ...workerArgs) {
        this.log.debug`spawning worker for ${getContext(ep).name}`;
        return this.spawn(()=> this.runWorker(ep, WorkerClass, workerArgs));
    }

    @handle(resolveImplementationDescriptor)
    resolveImplementationDescriptor(decoration) {
        this.log.debug`resolving dependency class for ${decoration.decorator}`;
    }

    @handle(resolveImplementationCtxDescriptor)
    resolveImplementationCtxDescriptor(decoration) {
        this.log.debug`resolving ctx class for ${decoration.decorator}`;
    }

    @handle(config)
    getConfig(key, obj) {
        this.log.debug`resolving config ${key}`;
        let names = getPath(obj);
        let conf = {default: this.config};

        names.unshift('default');

        for (let name of names) {
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
