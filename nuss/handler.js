import {dependencyDecorator} from './ioc/decorators';
import {factory, callable} from './ioc/create';
import {getDecoratedMethodContext} from './ioc/context';
import {createHandler} from './ioc/resolve';
import {logger} from './logging';


export class Handler {
    @logger
    log

    @factory
    getHandler({target}) {
        let {log} = this; //this.log.timeit();

        let ctx = getDecoratedMethodContext(target);

        log.debug`creating handler`;
        let handlerMethod = createHandler(ctx.decoration, target);
        log.debug`created handler in ${log.elapsed} ms`;

        return handlerMethod;
    }

    @callable
    handle() {
        //TODO: needed for test-container
    }
}

export function handler(proto, name, descr) {
    return dependencyDecorator(handler, {
        dependencyClass: Handler,
        factoryClass: Handler //TODO: try different approach
    })(proto, name, descr);
}
