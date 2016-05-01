import {createStubInstance, spy} from 'sinon';

import {getImplementation, createImplementation, provide} from './ioc/resolve';
import {getDecoratedMethods, decorators} from './ioc/decorators';
import {createInstance} from './ioc/create';
import {worker, workerContext} from './worker';
import {process} from './process';
import {handler} from './handler';
import {TasksAndIO, all} from './async';
import {concat} from './iter';
import {DefaultMap} from './default-maps';

import {configData, config} from './config';
import {flattenConfigData} from './config/loader';


const HANDLER_EXCLUDES=[worker, workerContext, handler];


export class TestContainer {
    constructor(cls, confData) {
        this.cls = cls;
        this.ecxludedDecorators = new Set([config]);
        this.rawConfigData = confData;
        this.subjects = new DefaultMap(()=> []);
        this.entrypoints = [];
    }

    @provide(getImplementation)
    resolveDependency(decoration, target) {
        let {ecxludedDecorators} = this;
        let {decorator, decoratorDescr: {dependencyClass}} = decoration;

        let obj = null;

        if (ecxludedDecorators.has(decorator)) {
            obj = createImplementation(decoration, target);
        } else {
            obj = createStubInstance(dependencyClass);
        }

        this.subjects.get(decorator).push(obj);
        return obj;
    }

    @provide(process)
    getProcess() {
        let [proc] = this.subjects.get(process);

        if (proc === undefined) {
            proc = {
                on: spy(),
                exit: spy(),
                stdout: {},
                stderr: {}
            };
            this.subjects.get(process).push(proc);
        }

        return proc;
    }

    @provide(configData)
    getConfigData() {
        let {confData, cls, rawConfigData} = this;

        if (confData === undefined) {
            confData = flattenConfigData(cls, rawConfigData, false);
            this.confData = confData;
        }

        return confData;
    }

    createEntrypoints() {
        let {entrypoints, cls} = this;

        for (let decoration of getDecoratedMethods(cls)) {
            let ep = getImplementation(decoration, this);
            entrypoints.push(ep);
        }
    }

    createTestSubjects({exclude=[], includes=[]}) {
        let {ecxludedDecorators, cls, start, stop} = this;

        exclude = new Set(concat(exclude, HANDLER_EXCLUDES, decorators(cls)));

        for (let include of includes) {
            exclude.delete(include);
        }

        for (let decorator of exclude) {
            ecxludedDecorators.add(decorator);
        }

        this.createEntrypoints();

        let subj = this.getSubjects.bind(this);
        subj.start = start.bind(this);
        subj.stop = stop.bind(this);
        return subj;
    }

    async start() {
        let {entrypoints} = this;

        let tasks = [];
        for (let ep of entrypoints) {
            tasks.push(ep.start());
        }

        await all(tasks);
    }

    async stop() {
        let {entrypoints} = this;

        let tasks = [];
        for (let ep of entrypoints) {
            tasks.push(ep.stop());
        }

        await all(tasks);
    }

    getSubjects(decoratorOrClass) {
        let {cls, subjects} = this;

        if (decoratorOrClass === cls) {
            let obj = createInstance(cls, [], {target: this});
            subjects.get(decoratorOrClass).push(obj);
        }
        return subjects.get(decoratorOrClass);
    }
}

export function createTestSubjects(cls, options={}) {
    let container = new TestContainer(cls, options.config);
    return container.createTestSubjects(options);
}


export async function spyCalled(spyObj, numCalls) {
    let {behaviors} = spyObj;
    if (behaviors !== undefined && numCalls === undefined) {
        numCalls = behaviors.length;
    }

    numCalls = numCalls || 1;

    while (spyObj.callCount < numCalls) {
        await TasksAndIO;
    }
}
