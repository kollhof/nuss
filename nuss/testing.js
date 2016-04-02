import {getImplementation, provide} from './ioc/resolve';
import {create} from './ioc/create';
import {spawnWorker} from './worker';

import {stub, createStubInstance} from 'sinon';


export class TestContainer {

    @provide(spawnWorker)
    getSpawnWorker() {
        return stub();
    }

    @provide(getImplementation)
    resolveDependency(decoration) {
        let {decoratorDescr} = decoration;
        let {dependencyClass} = decoratorDescr;

        return createStubInstance(dependencyClass);
    }
}

export function createMocked(cls, ...args) {
    return create(cls, args, new TestContainer());
}
