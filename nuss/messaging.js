import {methodDecorator, dependencyDecorator} from './ioc/decorators';
import {callable} from './ioc/create';
import {spawnWorker, spawn, workerContext} from './worker';
import {logger} from './logging';
import {config} from './config';

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

function trasnferHeadersToCtx(msg, ctx) {
    let attrs = msg.MessageAttributes;

    for (let key of ['foobar', 'trace']) {
        let val = attrs[key];

        if (val !== undefined) {
            ctx.setHeader(key, val.StringValue);
        }
    }
}


class Publisher {
    @asyncSQS
    sqs

    @logger
    log

    @workerContext
    workerCtx

    @config(undefined, 'The name of the queue given in the configuration')
    queue

    @config('queuePrefix')
    queuePrefix

    constructor(queue) {
        this.queue = queue;
    }

    async getQueueUrl() {
        return await getQueueUrl(this.queue, this.sqs);
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
        constructorArgs: [queue],
        config: {
            key: queue,
            path: ['queues']
        }
    });
}

export class MessageWorker {
    @logger
    log

    @asyncSQS
    sqs

    @workerContext
    workerCtx

    constructor(msg, queueUrl) {
        this.msg = msg;
        this.queueUrl = queueUrl;
    }

    @callable
    async processMessage(handler) {
        let {log, queueUrl, msg, workerCtx} = this;

        trasnferHeadersToCtx(msg, workerCtx);

        try {
            await handler(msg.Body);
        } catch (err) {
            log.error`worker ${err.stack}`;
            throw err;
        }

        log.debug`deleting msg ${msg.MessageId}`;

        await this.sqs.deleteMessage({
            QueueUrl: queueUrl,
            ReceiptHandle: msg.ReceiptHandle
        });
    }
}

class Consumer {
    @asyncSQS
    sqs

    @spawnWorker(MessageWorker)
    processMessage

    @spawn
    spawn

    @logger
    log

    @config(undefined, 'The name of the queue given in the configuration')
    queue

    constructor(queue) {
        this.queue = queue;
        this.queueUrl = null;
        this.stopped = false;
    }

    async ensureQueueExists() {
        this.queueUrl = await getQueueUrl(this.queue, this.sqs);
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
        let {log, queueUrl} = this;

        log.debug`fetching messages from ${this.queue}`;

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


    async pollMessages() {
        let {log, queue, queueUrl} = this;

        log.debug`start polling`;

        while (!this.stopped) {
            let messages = await this.fetchMessages();

            log.debug`processing messages ${messages.length} from ${queue}`;

            for (let msg of messages) {
                this.processMessage(msg, queueUrl);
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
        constructorArgs: [queue],
        config: {
            key: queue,
            path: ['queues']
        }
    });
}
