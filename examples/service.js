import {sleep} from 'nuss/async';
import {timer} from 'nuss/timer';
import {http} from 'nuss/http';
import {consumer, publisher} from 'nuss/messaging';
import {logger} from 'nuss/logging';
import {workerContext} from 'nuss/worker';
import {getContext} from 'nuss/ioc/context';
import {dependencyDecorator} from 'nuss/ioc/decorators';
import {inspect} from 'util';

const START_COUNTER = 0;
const TIMER_SLEEP_TIME = 1000;


let _cntr = START_COUNTER;

function inc() {
    _cntr += 1;
    return _cntr;
}

function* getContexts(obj) {
    let ctx = getContext(obj);
    while (ctx !== undefined) {
        yield ctx;
        ctx = getContext(ctx);
    }
}

function list(g) {
    return Array.from(g);
}

function ctorName(ctx){
    return ctx.constructor.name;
}


function mapCtx(ctx) {
    let {decoration} = ctx;

    if (decoration !== undefined) {
        let {decorator, decoratedClass, decoratedName} = decoration;

        return {
            ctx: ctx.constructor.name,
            cls: decoratedClass.name,
            nme: decoratedName,
            dec: decorator.name
        };
    }

    return {
        ctx: ctx.constructor.name,
        id: ctx.id
    };
}


class Ham {
    @logger
    log

    shrub() {
        let {log} = this;
        let ctxs = list(getContexts(this));

        let {wrk, names} = ctxs
            .map(mapCtx)
            .reduce((rslt, {cls, nme, dec, id})=> {
                if (id !== undefined) {
                    rslt.wrk = id;
                } else if (cls !== undefined) {
                    rslt.names.unshift(`${cls}.${nme}@${dec}`);
                }

                return rslt;
            }, {names: []});

        log.debug`\n\n<${wrk}>${names.join('-')}\n`;
    }
}
export function ham() {
    return dependencyDecorator(ham, {
        dependencyClass: Ham,
        constructorArgs: []
    });
}


class Spam {
    @logger
    log

    @ham()
    eggs

    shrub() {
        this.eggs.shrub();
    }
}

export function spam() {
    return dependencyDecorator(spam, {
        dependencyClass: Spam,
        constructorArgs: []
    });
}


export class Foobar {
    @logger
    log

    @publisher('foobar')
    shrub

    @workerContext
    workerCtx
    @spam()
    ni


    @consumer('foobar')
    async ni(msg) {
        let {log} = this;
        let cntr = inc();

        log.debug`-----${cntr}-----`;
        log.debug`message ${msg}`;
        log.debug`ctx headers ${this.workerCtx.headers}`;
        log.debug`------------------`;
        throw ''
    }

    @timer(TIMER_SLEEP_TIME)
    async handle1() {
        let {log} = this;
        let cntr = inc();

        this.ni.shrub();

        let ctxs = list(getContexts(this));
        let names = ctxs.map(mapCtx).map(inspect);

        log.debug`\n\n${names.join('\n')}\n`;

        log.debug`-----${cntr}-----`;
        this.shrub({ni: cntr});
        log.debug`ctx headers ${this.workerCtx.headers}`;
        log.debug`-----------------`;
    }

    @http('/hello/world')
    async handleHttp(req, resp) {
        let {log} = this;
        let cntr = inc();

        log.debug`-----${cntr}-----`;
        this.log.debug`http: ${req.headers}`;
        log.debug`ctx headers ${this.workerCtx.headers}`;
        resp.end(`Hello World:\n`);
        log.debug`-----------------`;
    }

    @http('/hello/world2')
    async handleHttp2(req, resp) {
        let {log} = this;
        let cntr = inc();

        log.debug`-----${cntr}-----`;
        this.log.debug`http: ${req.headers}`;
        log.debug`ctx headers ${this.workerCtx.headers}`;
        this.shrub({ni: cntr});
        resp.end(`Hello World 2: ${cntr}`);
        log.debug`-----------------`;
    }
}

