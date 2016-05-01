
import {dependencyDecorator} from './ioc/decorators';
import {factory} from './ioc/create';


export class Process {
    @factory
    getProcess() {
        return global.process; // eslint-disable-line
    }
}


export function process(proto, name, descr) {
    return dependencyDecorator(process, {
        dependencyClass: Process
    })(proto, name, descr);
}
