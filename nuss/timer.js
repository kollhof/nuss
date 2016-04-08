import {methodDecorator} from './ioc/decorators';
import {spawnWorker} from './worker';
import {logger} from './logging';


export class Timer {
    @spawnWorker
    handleTick

    @logger
    log

    constructor(duration) {
        this.duration = duration;
        this.interval = null;
    }

    async start() {
        this.log.debug`starting timer: ${this.duration}ms`;

        /* global setInterval:true*/
        this.interval = setInterval(
            ()=> this.handleTick(),
            this.duration
        );
    }

    async stop() {
        this.log.debug`stopping timer`;

        /* global clearInterval:true*/
        clearInterval(this.interval);
    }
}

export function timer(duration) {
    return methodDecorator(timer, {
        dependencyClass: Timer,
        constructorArgs: [duration]
    });
}
