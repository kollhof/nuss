import {timer} from 'nuss/timer';
import {http} from 'nuss/http';
import {consumer, publisher} from 'nuss/aws';
import {logger} from 'nuss/logging';
import {workerContext} from 'nuss/worker';

const TIMER_INTERVAL = 1000;


export class ExampleService {
    @logger
    log

    @workerContext
    workerCtx

    @publisher('example-queue')
    publish


    @consumer('example-queue')
    async handleMessage(msg) {
        let {log} = this;

        log.debug`recived message: ${msg}`;
        log.debug`ctx headers: ${this.workerCtx.headers}`;
    }

    @timer(TIMER_INTERVAL)
    async handleTick() {
        let {log} = this;

        await this.publish({date: new Date()});

        log.debug`ctx headers ${this.workerCtx.headers}`;
    }

    @http('/hello/world')
    async handleHelloWorld(req, resp) {
        let {log} = this;

        log.debug`http headers: ${req.headers}`;
        log.debug`ctx headers: ${this.workerCtx.headers}`;

        resp.end('Hello World');
    }

    @http('/publish/message')
    async handle(req, resp) {
        let {log} = this;

        log.debug`http headers: ${req.headers}`;
        log.debug`ctx headers: ${this.workerCtx.headers}`;

        let msg = {date: new Date()};

        await this.publish(msg);

        resp.end(`published msg: ${JSON.stringify(msg)}`);
    }
}
