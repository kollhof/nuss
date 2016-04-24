import {getImplementation, provide} from './ioc/resolve';
import {getDecoratedMethods, decorations} from './ioc/decorators';
import {createInstance, isCallable} from './ioc/create';
import {worker, workerContext} from './worker';
import {handler} from './handler';
import {TasksAndIO} from './async';

import {configData, config} from './config';
import {flattenConfigData} from './config/loader';
import {stub, createStubInstance} from 'sinon';


export class TestContainer {
    constructor(cls, confData) {
        this.cls = cls;
        this.ecxludedDecorators = new Set([config]);
        this.rawConfigData = confData;
    }

    @provide(getImplementation)
    resolveDependency(decoration) {
        let {ecxludedDecorators} = this;
        let {decoratorDescr} = decoration;
        let {dependencyClass} = decoratorDescr;

        if (ecxludedDecorators.has(decoration.decorator)) {
            return;
        }

        if (isCallable(dependencyClass)) {
            return stub();
        }

        let obj = createStubInstance(dependencyClass);
        return obj;
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

    createTestSubject(args) {
        return createInstance(this.cls, args, {target: this});
    }

    createTestHandler() {
        for (let decoration of decorations(this.cls)) {
            this.ecxludedDecorators.add(decoration.decorator);
        }

        return createInstance(this.cls, [], {target: this});
    }

    createEntrypoints() {
        let {ecxludedDecorators} = this;

        ecxludedDecorators.add(worker);
        ecxludedDecorators.add(workerContext);
        ecxludedDecorators.add(handler);

        for (let decoration of decorations(this.cls)) {
            ecxludedDecorators.add(decoration.decorator);
        }

        let entrypoints = [];

        for (let decoration of getDecoratedMethods(this.cls)) {
            let ep = getImplementation(decoration, this);
            entrypoints.push(ep);
        }

        return entrypoints;
    }
}

export function createMocked(cls, args=[], confData={}) {
    let container = new TestContainer(cls, confData);
    return container.createTestSubject(args);
}

export function createTestHandler(cls, confData={}) {
    let container = new TestContainer(cls, confData);
    return container.createTestHandler();
}

export function createTestEntrypoints(cls, confData={}) {
    let container = new TestContainer(cls, confData);
    return container.createEntrypoints();
}

export async function spyCalled(spy, numCalls) {
    let {behaviors} = spy;
    if (behaviors !== undefined && numCalls === undefined) {
        numCalls = behaviors.length;
    }

    numCalls = numCalls || 1;

    while (spy.callCount < numCalls) {
        await TasksAndIO;
    }
}
