import {inspect} from 'util';
import {hrtime} from './profiling';
import {getContext} from './ioc/context';


const RESET = '\x1b[0m';
const GRREEN = '\x1b[32;22m';

const MILLI_SECONDS = 1000;
const NANO_SECONDS = 1000000;


export class BaseLogger {

    debug(parts, ...args) {
        this.log('DEBUG', parts, args);
    }

    info(parts, ...args) {
        this.log('INFO', parts, args);
    }

    error(parts, ...args) {
        this.log('ERROR', parts, args);
    }
}

export class TimingLogger extends BaseLogger {
    constructor(parent) {
        super();
        this.parent = parent;
        this.startTime = hrtime();
    }

    log(level, parts, args) {
        this.parent.log(level, parts, args);
    }

    get elapsed() {
        let [sec, nsec] = hrtime(this.startTime);

        return (sec * MILLI_SECONDS) + (nsec / NANO_SECONDS);
    }
}

function formatItem(obj) {
    if (typeof obj === 'string') {
        return obj;
    }
    return inspect(obj, {colors: true, depth: 0});
}

export class Logger extends BaseLogger {
    constructor(target) {
        super();
        this.target = target;
    }

    log(level, parts, args) {
        let msg = String.raw(parts, ...(args.map(formatItem)));

        /* global process:true */
        process.stdout.write(
            `${level}:${GRREEN}${this.prefix}${RESET}: ${msg}\n`
        );
    }

    timeit() {
        return new TimingLogger(this);
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


