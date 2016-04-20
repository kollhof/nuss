import {getImplementation, provide} from './ioc/resolve';
import {createInstance, isCallable, isFactory} from './ioc/create';
import {configData, config} from './config';
import {flattenConfigData} from './config/loader';
import {stub, createStubInstance} from 'sinon';


export class TestContainer {
    constructor(cls, confData) {
        this.cls = cls;
        this.rawConfigData = confData;
    }

    @provide(getImplementation)
    resolveDependency(decoration) {
        let {decoratorDescr} = decoration;
        let {dependencyClass} = decoratorDescr;

        if (decoration.decorator === config) {
            return;
        }

        if (isCallable(dependencyClass)) {
            return stub();
        }

        return createStubInstance(dependencyClass);
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
}

export function createMocked(cls, args, confData={}) {
    let container = new TestContainer(cls, confData);
    return container.createTestSubject(args);
}
