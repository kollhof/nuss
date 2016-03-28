import {methodDecorator} from './ioc/decorators';
import {spawnWorker} from './container';
import {logger} from './ctxlogger';


export class Timer {
    @spawnWorker
    spawnWorker

    @logger
    log

    constructor(duration) {
        this.duration = duration;
        this.interval = null;
    }

    async start() {
        /* global setInterval:true*/
        this.interval = setInterval(
            ()=> this.spawnWorker(this.handleTick.bind(this)),
            this.duration
        );
    }

    async stop() {
        this.log.debug`stopping timer`;

        /* global clearInterval:true*/
        clearInterval(this.interval);
    }

    async handleTick(handler) {
        await handler(this.duration);
    }
}

export function timer(duration) {
    return methodDecorator(timer, {
        dependencyClass: Timer,
        constructorArgs: [duration]
    });
}
