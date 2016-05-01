import {dependencyDecorator} from './ioc/decorators';
import {factory} from './ioc/create';
import {getDecoratedMethodContext} from './ioc/context';
import {createHandler} from './ioc/resolve';
import {logger} from './logging';


export class Handler {
    @logger
    log

    @factory
    getHandler({target}) {
        // TODO: this.log.timeit();
        let {log} = this;

        let ctx = getDecoratedMethodContext(target);

        log.debug`creating handler`;
        let handlerMethod = createHandler(ctx.decoration, target);
        log.debug`created handler in ${log.elapsed} ms`;

        return handlerMethod;
    }
}

export function handler(proto, name, descr) {
    return dependencyDecorator(handler, {
        dependencyClass: Handler
    })(proto, name, descr);
}
