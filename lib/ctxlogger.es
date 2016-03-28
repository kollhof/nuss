import {getContext} from './ioc/context';
import {Logger as BaseLogger} from './logging';


class Logger extends BaseLogger {
    constructor(target) {
        super();
        this.target = target;
    }

    get prefix() {
        let ctx = getContext(this.target) || this.target;
        let name = ctx ? ctx.name: undefined;

        if (name === undefined) {
            name = ctx.constructor.name;
        }
        return name;
    }
}

export function logger(proto, name, descr) {
    descr.initializer = function() {
        return new Logger(this);
    };
    return descr;

}
