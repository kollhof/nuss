import {getDecoratedMethods} from './ioc/decorators';
import {getImplementation, createImplementation, provide} from './ioc/resolve';
import {worker} from './worker';
import {all, TaskSet} from './async';
import {logger} from './logging';

import {dependencyDecorator} from './ioc/decorators';


export class Container {
    @logger
    log

    constructor() {
        this.entrypoints = [];
        this.activeTasks = new TaskSet();
    }

    createEntrypoints(ServiceClass) {
        let {log, entrypoints} = this;

        log = log.timeit();
        log.debug`creating entrypoints`;

        for (let decoration of getDecoratedMethods(ServiceClass)) {

            // TODO: support decoration in logging
            log.debug`creating entrypoint for ${decoration.decorator}`;
            let ep = getImplementation(decoration, this);

            entrypoints.push(ep);
        }

        log.debug`all entrypoints created in ${log.elapsed} ms`;
    }

    async start(ServiceClass) {
        let log = this.log.timeit();

        log.debug`starting container`;

        this.createEntrypoints(ServiceClass);
        await this.startEntrypoints();

        log.debug`container started in ${log.elapsed} ms`;
    }

    async startEntrypoints() {
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

    spawnWorker(decoration, target, ...workerArgs) {
        return this.spawn(()=> {
            this.log.debug`spawning worker for ${target}`;
            let workerFunc = this.createWorker(decoration, target);
            return this.runWorker(workerFunc, workerArgs);
        });
    }

    createWorker(decoration, target) {
        let log = this.log.timeit();

        log.debug`creating worker for ${target} ${decoration}`;
        let workerFunc = createImplementation(decoration, target);
        log.debug`created worker ${workerFunc} in ${log.elapsed} ms`;
        return workerFunc;
    }

    async runWorker(workerFunc, workerArgs) {
        let log = this.log.timeit();

        log.debug`invoking worker ${workerFunc}`;
        await workerFunc(...workerArgs);
        log.debug`worker ${workerFunc} completed in ${log.elapsed} ms`;
    }

    @provide(worker)
    worker(decoration, target) {
        return this.spawnWorker.bind(this, decoration, target);
    }
}


export function container(proto, name, descr) {
    return dependencyDecorator(container, {
        dependencyClass: Container
    })(proto, name, descr);
}

