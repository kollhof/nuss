import {SQS} from 'aws-sdk';

import {dependencyDecorator} from '../ioc/decorators';
import {config} from '../config';
import {logger} from '../logging';

class AsyncSQS {
    @config('aws')
    config

    @logger
    log

    constructor() {
        this.sqs = new SQS(this.config);
        this.stopped = false;
    }

    createQueue(...args) {
        return this._perform('createQueue', args);
    }

    sendMessage(...args) {
        return this._perform('sendMessage', args);
    }

    receiveMessage(...args) {
        return this._perform('receiveMessage', args);
    }

    deleteMessage(...args) {
        return this._perform('deleteMessage', args);
    }

    _perform(name, args) {
        let sqs = this.sqs;
        let handler = sqs[name].bind(sqs);

        return new Promise((resolve, reject)=> {
            handler(...args, (err, data)=> {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }
}

export function asyncSQS(...args) {
    return dependencyDecorator(asyncSQS, {
        dependencyClass: AsyncSQS,
        constructorArgs: []
    })(...args);
}
