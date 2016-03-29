import {methodDecorator, dependencyDecorator} from './ioc/decorators';
import {callable} from './ioc/create';
import {spawnWorker, spawn, workerContext} from './container';
import {logger} from './ctxlogger';

import {asyncSQS} from './aws/sqs';


const QUEUE_CACHE = new Map();


async function getQueueUrl(queue, sqs) {
    let task = QUEUE_CACHE.get(queue);

    if (task !== undefined) {
        let data = await task;

        return data.QueueUrl;
    }

    task = sqs.createQueue({QueueName: queue});
    QUEUE_CACHE.set(queue, task);

    let data = await task;

    return data.QueueUrl;
}

class Publisher {
    @asyncSQS
    sqs

    @logger
    log

    @workerContext
    workerCtx

    constructor(queue) {
        this.queue = queue;
        this.queueUrl = null;
    }

    async getQueueUrl() {
        return await getQueueUrl(this.queue, this.sqs);

        // let queueUrl = this.queueUrl;

        // if (queueUrl) {
        //     return queueUrl;
        // }

        // queueUrl = await this.ensureQueueExists();
        // this.queueUrl = queueUrl;

        // return queueUrl;
    }

    async ensureQueueExists() {
        let data = await this.sqs.createQueue({QueueName: this.queue});

        return data.QueueUrl;
    }

    @callable
    async publish(msg) {
        let {log, workerCtx} = this;

        log.debug`publish ${msg} -> ${this.queue}`;
        let queueUrl = await this.getQueueUrl();

        let attrs = {};

        for (let key of ['foobar', 'trace']) {
            let val = workerCtx.getHeader(key);

            if (val !== undefined) {
                attrs[key] = {
                    DataType: 'String',
                    StringValue: `${val}`
                };
            }
        }

        return await this.sqs.sendMessage({
            QueueUrl: queueUrl,
            MessageAttributes: attrs,
            MessageBody: JSON.stringify(msg)
        });
    }
}

export function publisher(queue) {
    return dependencyDecorator(publisher, {
        dependencyClass: Publisher,
        constructorArgs: [queue]
    });
}


class Consumer {
    @asyncSQS
    sqs

    @spawnWorker
    spawnWorker

    @spawn
    spawn

    @logger
    log

    constructor(queue) {
        this.queue = queue;
        this.queueUrl = null;
        this.stopped = false;
    }

    async getQueueUrl() {
        return await getQueueUrl(this.queue, this.sqs);

        // let queueUrl = this.queueUrl;

        // if (queueUrl) {
        //     return queueUrl;
        // }

        // queueUrl = await this.ensureQueueExists();
        // this.queueUrl = queueUrl;

        // return queueUrl;
    }

    async ensureQueueExists() {
        let data = await this.sqs.createQueue({QueueName: this.queue});

        return data.QueueUrl;
    }

    async start() {
        let {log} = this;

        log.debug`starting consumer`;
        await this.ensureQueueExists();

        log.debug`spawning message polling`;
        this.spawn(()=> this.pollMessages());
        log.debug`spawned message polling`;
    }

    async fetchMessages() {
        let {log} = this;

        log.debug`fetching messages from ${this.queue}`;

        let queueUrl = await this.getQueueUrl();

        let data = await this.sqs.receiveMessage({
            QueueUrl: queueUrl,
            WaitTimeSeconds: 10,
            MaxNumberOfMessages: 10,
            MessageAttributeNames: [
                'foobar', 'trace'
            ]
        });

        return data.Messages || [];
    }

    async processMessage(msg, handler, workerCtx) {
        let {log} = this;

        let attrs = msg.MessageAttributes;

        for (let key of ['foobar', 'trace']) {
            let val = attrs[key];

            if (val !== undefined) {
                workerCtx.setHeader(key, val.StringValue);
            }
        }

        try {
            await handler(msg.Body);
        } catch (err) {
            log.error`worker ${err.stack}`;
            //TODO: application error ?!
            return;
        }

        log.debug`deleting msg ${msg.MessageId}`;

        let queueUrl = await this.getQueueUrl();

        await this.sqs.deleteMessage({
            QueueUrl: queueUrl,
            ReceiptHandle: msg.ReceiptHandle
        });
    }

    async pollMessages() {
        let {log, queue} = this;

        log.debug`start polling`;

        while (!this.stopped) {
            let messages = await this.fetchMessages();

            log.debug`processing messages ${messages.length} from ${queue}`;

            for (let msg of messages) {
                this.spawnWorker(
                    (handler, workerCtx)=>
                        this.processMessage(msg, handler, workerCtx)
                );
            }
        }

        log.debug`stopped polling`;
    }

    async stop() {
        let {log} = this;

        log.debug`stop consumer`;
        this.stopped = true;
    }
}

export function consumer(queue) {
    return methodDecorator(consumer, {
        dependencyClass: Consumer,
        constructorArgs: [queue]
    });
}
