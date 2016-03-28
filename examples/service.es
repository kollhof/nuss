import {sleep} from 'nuss/lib/async';
import {timer} from 'nuss/lib/timer';
import {http} from 'nuss/lib/http';
import {consumer, publisher} from 'nuss/lib/messaging';
import {logger} from 'nuss/lib/ctxlogger';
import {workerContext} from 'nuss/lib/container';

const START_COUNTER = 0;
const TIMER_SLEEP_TIME = 1000;


let _cntr = START_COUNTER;

function inc() {
    _cntr += 1;
    return _cntr;
}

export class Foobar {
    @logger
    log

    @publisher('foobar')
    shrub

    @workerContext
    workerCtx

    @consumer('foobar')
    async ni(msg) {
        let {log} = this;
        let cntr = inc();

        log.debug`-----${cntr}-----`;
        log.debug`message ${msg}`;
        log.debug`headers ${this.workerCtx.headers}`;
        log.debug`------------------`;
    }

    @timer(TIMER_SLEEP_TIME)
    async handle1() {
        let {log} = this;
        let cntr = inc();

        log.debug`-----${cntr}-----`;
        this.shrub({ni: cntr});
        log.debug`-----------------`;
    }

    @http('/hello/world')
    async handleHttp(req, resp) {
        let {log} = this;
        let cntr = inc();

        log.debug`-----${cntr}-----`;
        this.log.debug`http: ${req.headers}`;
        resp.end(`Hello World:\n`);
        log.debug`-----------------`;
    }

    @http('/hello/world2')
    async handleHttp2(req, resp) {
        let {log} = this;
        let cntr = inc();

        log.debug`-----${cntr}-----`;
        this.log.debug`http: ${req.headers}`;
        this.shrub({ni: cntr});
        resp.end(`Hello World 2: ${cntr}`);
        log.debug`-----------------`;
    }
}

