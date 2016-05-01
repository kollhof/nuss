import {inspect} from 'util';
import vm from 'vm';

import {hrtime} from './profiling';
import {process} from './process';
import {config} from './config';
import {Script} from './config/loader';
import {getContext, getWorkerContext} from './ioc/context';
import {dependencyDecorator} from './ioc/decorators';
import {callable} from './ioc/create';
import {
    colorize, intense,
    Green, Yellow, White, Red, Faint, Bold, Cyan
} from './colorize';


export const COLOR_MAP = {
    worker: colorize(Green),
    DEBUG: colorize(Yellow, Faint),
    ERROR: colorize(intense(Red), Bold),
    INFO: colorize(White),
    name: colorize(Green, Faint)
};

const MILLI_SECONDS = 1000;
const NANO_SECONDS = 1000000;

export const ERROR = 3;
export const INFO = 2;
export const DEBUG = 1;

const LEVELS = {
    debug: DEBUG,
    error: ERROR,
    info: INFO
};

const LEVEL_NAMES = {
    [DEBUG]: 'DEBUG',
    [ERROR]: 'ERROR',
    [INFO]: 'INFO'
};

export class BaseLogger {

    debug(parts, ...args) {
        this.log(DEBUG, parts, args);
    }

    info(parts, ...args) {
        this.log(INFO, parts, args);
    }

    error(parts, ...args) {
        this.log(ERROR, parts, args);
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


function getName(obj, {decoration}) {
    let {decorator, decoratedClass, decoratedName} = decoration;
    let wrk = getWorkerContext(obj);

    let cls = decoratedClass.name;
    let nme = decoratedName;
    let dec = decorator.name;

    let clr = COLOR_MAP.name;

    let name = clr`${cls}.${nme}@${dec}`;

    if (wrk !== undefined) {
        name += COLOR_MAP.worker`<${wrk.id}>`;
    }

    return name;
}


function getNamePath(obj) {
    let names = [];
    let ctx = getContext(obj);

    if (ctx === undefined || ctx.decoration === undefined) {
        let clr = COLOR_MAP.name;
        names.push(clr`${obj.constructor.name}`);
    }

    while (ctx !== undefined && ctx.decoration !== undefined) {
        let name = getName(obj, ctx);

        names.unshift(name);

        obj = ctx.target;
        ctx = getContext(obj);
    }
    return `${names.join('-')}`;
}

function formatItem(obj) { // eslint-disable-line complexity
    if (obj !== null) {
        if (getContext(obj) !== undefined) {
            return getNamePath(obj);
        } else if (obj instanceof Function) {
            return colorize(Cyan)`${obj.name}()`;
        } else if (obj instanceof Error) {
            return obj.stack;
        }
    }
    return inspect(obj, {colors: true, depth: 0});
}

export class Formatter {
    @config('format', 'message format')
    formatScript=new Script('`${shortColoredLevel}:${context}: ${message}`')

    // @config('colorize messages')
    // colorize=true

    @callable
    format(level, target, parts, args) { // eslint-disable-line max-params
        if (this.formatScript === undefined) {
            // TODO:
            return;
        }

        let formatCtx = vm.createContext({
            level,

            get context() {
                return getNamePath(target);
            },

            get shortColoredLevel() {
                let levelName = LEVEL_NAMES[level];
                let clr = COLOR_MAP[levelName];
                return clr`${levelName[0]}`;
            },

            get message() {
                return String.raw({raw: parts}, ...(args.map(formatItem)));
            }
        });

        // TODO: is running script in context better than
        // running the script to return a function once and then call that
        // function?
        return this.formatScript.run(formatCtx);
    }
}


export function formatter(proto, name, descr) {
    return dependencyDecorator(formatter, {
        dependencyClass: Formatter,
        config: [{
            key: 'formatter',
            description: 'Custom Formatter'
        }]
    })(proto, name, descr);
}


export class Handler {

    // @config('class', 'handler class')
    // cls='nuss/logging/StreamHandler'

    @config('output stream')
    stream='stderr'

    @formatter
    format

    @process
    process

    constructor() {

        let {stream} = this;

        if (stream === 'stderr' || stream === 'stdout') {
            stream = this.process[stream];
        }

        this.stream = stream;
    }

    handle(level, target, parts, args) { // eslint-disable-line max-params
        let entry = this.format(level, target, parts, args);

        // TODO: how can entry be undefined?
        if (entry !== undefined) {
            this.stream.write(`${entry}\n`);
        }
    }

    // @factory
    // getHandler() {
    //     // TODO: resolve class from config
    //     return new StreamHandler(this.formatter, ...this.args);
    // }
}

export function handler(proto, name, descr) {
    return dependencyDecorator(handler, {
        dependencyClass: Handler,
        config: [{
            key: 'handler',
            description: 'Custom Handler'
        }]
    })(proto, name, descr);
}


export class Logger extends BaseLogger {
    @config('Log level (error, info, debug)')
    level='debug'

    @handler
    handler

    constructor() {
        super();
        this.target = getContext(this).target;
        this.level = LEVELS[this.level];
    }

    log(level, parts, args) {
        if (level < this.level) {
            return;
        }
        this.handler.handle(level, this.target, parts, args);
    }

    timeit() {
        return new TimingLogger(this);
    }
}


export function logger(proto, name, descr) {
    return dependencyDecorator(logger, {
        dependencyClass: Logger,
        config: [{
            root: true,
            key: 'logger',
            description: 'Logger configuration'
        }]
    })(proto, name, descr);
}
