import {SQS} from 'aws-sdk';

import {dependencyDecorator} from '../ioc/decorators';
import {factory} from '../ioc/create';
import {config} from '../config';
import {logger} from '../logging';
import {wrap, wraps} from '../async';


// TODO: needs to be provided by container
const QUEUE_CACHE = new Map();


export async function getQueueUrl(queue, sqs) {
    let task = QUEUE_CACHE.get(queue);

    if (task !== undefined) {
        let data = await task;

        return data.QueueUrl;
    }

    task = sqs.getQueueUrl({QueueName: queue});
    QUEUE_CACHE.set(queue, task);

    let data = await task;

    return data.QueueUrl;
}


@wraps('sqs')
class AsyncSQS {
    SQSClass=SQS

    @config('accessKeyId')
    accessKeyId

    @config('secretAccessKey')
    secretAccessKey

    @config('region')
    region

    @logger
    log

    constructor() {
        this.receiveRequests = new Set();
    }

    stop() {
        for (let req of this.receiveRequests) {
            req.abort();
        }
    }

    get sqs() {
        let {secretAccessKey, accessKeyId, region, SQSClass, _sqs} = this;

        // TODO: issue with sinon calling the getter when creating stubs
        if (_sqs === undefined && SQSClass !== undefined) {
            this._sqs = new SQSClass({secretAccessKey, accessKeyId, region});
        }
        return this._sqs;
    }

    @wrap
    createQueue

    @wrap
    sendMessage

    @wrap
    deleteMessage

    @wrap
    getQueueUrl

    receiveMessage(...args) {
        let {sqs, receiveRequests} = this;
        let {receiveMessage} = sqs;
        receiveMessage = receiveMessage.bind(sqs);

        return new Promise((resolve, reject)=> {
            let req = receiveMessage(...args, (err, data)=> {
                receiveRequests.delete(req);

                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });

            receiveRequests.add(req);
        });
    }
}

export function asyncSQS(...args) {
    return dependencyDecorator(asyncSQS, {
        dependencyClass: AsyncSQS,
        config: [{
            root: true,
            key: 'aws',
            description: 'AWS configuration'
        }]
    })(...args);
}
