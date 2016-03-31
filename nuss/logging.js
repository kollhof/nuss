import {inspect} from 'util';
import {hrtime} from './profiling';
import {getContextDescr, getContexts, Context} from './ioc/context';


const RESET = '\x1b[0m';

const Black = 0;
const Red = 1;
const Green = 2;
const Yellow = 3;
const Blue = 4;
const Magenta = 5;
const Cyan = 6;
const White = 7;

const Bold = 1;
const Faint = 2;
const Normal = 22;

const Intense = 60;

function fg(col, mod=Normal) {
    return `\x1b[${30+col};${mod}m`;
}

const COLOR_MAP = {
    InvokerContext: fg(Cyan),
    WorkerContext: fg(Green),
    InjectionContext: fg(Cyan, Faint),
    DEBUG: fg(Yellow, Faint),
    ERROR: fg(Intense + Red, Bold),
    INFO: fg(White),
    name: fg(Green, Faint)
};

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

function nameSingleCtx(ctx, cls, nme, dec, id) {
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
                rslt.names.unshift(nameSingleCtx(ctx, cls, nme, dec, id));
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
    if (typeof obj === 'string') {
        return obj;
    } else if (obj instanceof Context) {
        return nameContext(obj);
    } else if (obj instanceof Function) {
        return `${fg(Cyan)}${obj.name}()${RESET}`;
    }
    return inspect(obj, {colors: true, depth: 0});
}


export class Logger extends BaseLogger {
    constructor(target) {
        super();
        this.target = target;
    }

    log(level, parts, args) {
        let msg = String.raw({raw: parts}, ...(args.map(formatItem)));
        let prefix = nameContext(this.target);
        let clr = COLOR_MAP[level] || RESET;

        /* global process:true */
        process.stdout.write(`${clr}${level[0]}${RESET}:${prefix}: ${msg}\n`);
    }

    timeit() {
        return new TimingLogger(this);
    }
}

export function logger(proto, name, descr) {
    descr.writable = true;
    descr.initializer = function() {
        return new Logger(this);
    };
    return descr;
}


