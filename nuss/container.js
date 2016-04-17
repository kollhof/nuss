import {getDecoratedMethods} from './ioc/decorators';
import {
    getImplementation, createDecoratedHandler, provide
} from './ioc/resolve';
import {create} from './ioc/create';
import {getContext} from './ioc/context';
import {WorkerContext, worker} from './worker';
import {all, TaskSet} from './async';
import {logger} from './logging';


export class Container {
    @logger
    log

    constructor(ServiceClass) {
        this.ServiceClass = ServiceClass;
        this.entrypoints = [];
        this.activeTasks = new TaskSet();
    }

    createEntrypoints() {
        let {log, entrypoints, ServiceClass} = this;

        log = log.timeit();
        log.debug`creating entrypoints`;

        for (let descr of getDecoratedMethods(ServiceClass)) {
            log.debug`creating entrypoint for ${descr.decorator}`;
            let ep = getImplementation(descr, this);

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
            log.error`not all tasks stopped: ${err.errors[0].stack}`;
        }
        log.debug`all tasks stopped in ${log.elapsed} ms`;
    }

    spawn(taskFunction) {
        return this.activeTasks.spawn(taskFunction);
    }

    async runWorker(source, WorkerClass, workerArgs) {
        let log = this.log.timeit();
        let {decoration} = getContext(source);

        log.debug`creating worker for ${source}`;
        let workerCtx = create(WorkerContext, [], {target: source});
        let workerFunc = create(WorkerClass, workerArgs, {target: workerCtx});
        log.debug`${source} worker created in ${log.elapsed} ms`;

        log.debug`creating handler for ${workerCtx}`;
        let handler = createDecoratedHandler(decoration, workerCtx);
        log.debug`handler created in ${log.elapsed} ms`;

        log.debug`invoking worker ${workerCtx}`;
        await workerFunc(handler);
        log.debug`worker ${workerCtx} completed in ${log.elapsed} ms`;
    }

    @provide(worker)
    worker(decoration, source) {
        let workerClass = decoration.decoratorDescr.dependencyClass;
        return (...args)=> {
            this.log.debug`spawning worker for ${source}`;
            return this.spawn(()=> this.runWorker(source, workerClass, args));
        };
    }

    // @provide(getImplementation)
    // getImplementation(decoration) {
    //     this.log.debug`resolving impl for ${decoration.decorator}`;
    // }
}
