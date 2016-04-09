import {inspect} from 'util';
import {hrtime} from './profiling';
import {config} from './config';
import {getContextDescr, getContexts, getContext} from './ioc/context';
import {dependencyDecorator} from './ioc/decorators';


export const RESET = '\x1b[0m';

export const Black = 0;
export const Red = 1;
export const Green = 2;
export const Yellow = 3;
export const Blue = 4;
export const Magenta = 5;
export const Cyan = 6;
export const White = 7;

export const Bold = 1;
export const Faint = 2;
export const Normal = 22;

export const Intense = 60;
export const Standard = 30;

function fg(col, mod=Normal) {
    return `\x1b[${Standard+col};${mod}m`;
}

const COLOR_MAP = {
    WorkerContext: fg(Green),
    DEBUG: fg(Yellow, Faint),
    ERROR: fg(Intense + Red, Bold),
    INFO: fg(White),
    name: fg(Green, Faint)
};

const MILLI_SECONDS = 1000;
const NANO_SECONDS = 1000000;

const ERROR = 3;
const INFO = 2;
const DEBUG = 1;

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

    log() {
        // nop
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

function nameSingleCtx(ctx, cls, nme, dec, id) { /* eslint max-params: 0 */
    let clr = COLOR_MAP[ctx] || COLOR_MAP.name;
    if (id !== undefined) {
        return `${clr}<${id}>${RESET}`;
    } else if (cls !== undefined) {
        return `${clr}${cls}.${nme}@${dec}${RESET}`;
    }
    return `${clr}${ctx}${RESET}`;
}

function nameContext(target) {
    let ctxs = getContexts(target);
    let {wrk, names, name} = Array
        .from(ctxs)
        .map(getContextDescr)
        .reduce((rslt, {ctx, cls, nme, dec, id})=> {
            if (id === undefined) {
                if (cls === undefined) {
                    rslt.name = nameSingleCtx(ctx, cls, nme, dec, id);
                } else {
                    rslt.names.unshift(nameSingleCtx(ctx, cls, nme, dec, id));
                }
            } else {
                rslt.wrk = nameSingleCtx(ctx, cls, nme, dec, id);
            }

            return rslt;
        }, {names: []});

    if (wrk) {
        return `${wrk}${names.join('-')}`;
    } else if (names.length > 0) {
        return `${names.join('-')}`;
    }
    return `${name}`;
}

function formatItem(obj) {
    if (obj instanceof Function) {
        return `${fg(Cyan)}${obj.name}()${RESET}`;
    } else if (obj instanceof Error) {
        return obj.stack;
    } else if (getContext(obj) !== undefined) {
        return nameContext(obj);
    }
    return inspect(obj, {colors: true, depth: 0});
}


export class Logger extends BaseLogger {
    @config('level', 'Log level (error, info, debug)')
    level='error'

    constructor() {
        super();
        this.target = getContext(this).target;
        this.level = LEVELS[this.level] || ERROR;
    }

    log(level, parts, args) {
        if (level < this.level) {
            return;
        }

        let msg = String.raw({raw: parts}, ...(args.map(formatItem)));
        let prefix = nameContext(this.target);

        level = LEVEL_NAMES[level];
        let clr = COLOR_MAP[level] || RESET;

        /* global process: true */
        process.stdout.write(`${clr}${level[0]}${RESET}:${prefix}: ${msg}\n`);
    }

    timeit() {
        return new TimingLogger(this);
    }
}


export function logger(proto, name, descr) {
    // TODO:
    //proto[name] = new BaseLogger();

    descr.writable = true;
    return dependencyDecorator(logger, {
        dependencyClass: Logger,
        constructorArgs: [proto],
        config: {
            key: 'logging',
            path: '/',
            description: 'Logging configuration'
        }
    })(proto, name, descr);
}
