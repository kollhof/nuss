import {SQS} from 'aws-sdk';

import {dependencyDecorator} from '../ioc/decorators';
import {config} from '../config';
import {logger} from '../logging';

class AsyncSQS {

    @config('accessKeyId')
    accessKeyId

    @config('secretAccessKey')
    secretAccessKey

    @config('region')
    region

    @logger
    log

    constructor() {
        let {secretAccessKey, accessKeyId, region} = this;
        this.sqs = new SQS({secretAccessKey, accessKeyId, region});
        this.receiveRequests = new Set();
    }

    stop() {
        for (let req of this.receiveRequests) {
            req.abort();
        }
    }

    createQueue(...args) {
        return this._perform('createQueue', args);
    }

    getQueueUrl(...args) {
        return this._perform('getQueueUrl', args);
    }

    sendMessage(...args) {
        return this._perform('sendMessage', args);
    }

    receiveMessage(...args) {
        return this._perform('receiveMessage', args, this.receiveRequests);
    }

    deleteMessage(...args) {
        return this._perform('deleteMessage', args);
    }

    _perform(name, args, requests) {
        let sqs = this.sqs;
        let handler = sqs[name].bind(sqs);

        return new Promise((resolve, reject)=> {
            let req = handler(...args, (err, data)=> {
                if (requests !== undefined) {
                    requests.delete(req);
                }
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });

            if (requests !== undefined) {
                requests.add(req);
            }
        });
    }
}

export function asyncSQS(...args) {
    return dependencyDecorator(asyncSQS, {
        dependencyClass: AsyncSQS,
        constructorArgs: [],
        config: [{
            root: true,
            key: 'aws',
            description: 'AWS configuration'
        }]
    })(...args);
}
