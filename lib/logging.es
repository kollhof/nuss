/* global console:true*/
/* eslint no-console:0*/
import {inspect, format} from 'util';

function merge(iter1, iter2) {
    var items = [];
    let i = iter2.length;

    items.unshift(iter1[i]);

    while (i--) {
        items.unshift(iter2[i]);
        items.unshift(iter1[i]);
    }
    return items;
}

const RESET = '\x1b[0m';
const GRREEN = '\x1b[32;22m';

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

    log(level, parts, args) {
    }
}

export class TimingLogger extends BaseLogger {
    constructor(parent) {
        super();
        this.parent = parent;
        this.startTime = process.hrtime();
    }

    log(level, parts, args) {
        this.parent.log(level, parts, args);
    }

    get elapsed() {
        let [sec, nsec] = process.hrtime(this.startTime);
        return (sec * 1000) + (nsec / 1000000);
    }
}

function formatItem(obj) {
    if (typeof obj === 'string') {
        return obj;
    }
    return inspect(obj, {colors: true, depth: 0});
}

export class Logger extends BaseLogger {
    constructor(name) {
        super();
        this.name = name;
    }

    log(level, parts, args) {
        args = args.map(formatItem);

        parts = merge(parts, args);

        process.stdout.write(
            `${level}:${GRREEN}${this.prefix}${RESET}: ${parts.join('')}\n`
        );
    }

    get prefix() {
        return this.name;
    }

    timeit() {
        return new TimingLogger(this);
    }
}


export function logger(name) {
    var log = new Logger(name);
    return {
        debug: log.debug.bind(log),
        info: log.info.bind(log),
        error: log.error.bind(log),
        timeit: log.timeit.bind(log)
    };
}
