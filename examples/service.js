import {timer} from 'nuss/timer';
import {http} from 'nuss/http';
import {consumer, publisher} from 'nuss/messaging';
import {logger} from 'nuss/logging';
import {workerContext} from 'nuss/worker';


const START_COUNTER = 0;
const TIMER_SLEEP_TIME = 1000;


let globalCounter = START_COUNTER;

function inc() {
    globalCounter += 1;
    return globalCounter;
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
        log.debug`ctx headers ${this.workerCtx.headers}`;
        log.debug`------------------`;
    }

    @timer(TIMER_SLEEP_TIME)
    async handle1() {
        let {log} = this;
        let cntr = inc();

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

