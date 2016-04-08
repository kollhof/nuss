import {getImplementation, provide} from './ioc/resolve';
import {create, isCallable} from './ioc/create';

import {stub, createStubInstance} from 'sinon';


export class TestContainer {

    @provide(getImplementation)
    resolveDependency(decoration) {
        let {decoratorDescr} = decoration;
        let {dependencyClass} = decoratorDescr;

        if (isCallable(dependencyClass)) {
            return stub();
        }

        return createStubInstance(dependencyClass);
    }
}

export function createMocked(cls, ...args) {
    return create(cls, args, {target: new TestContainer()});
}
