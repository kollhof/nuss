import {methodDecorator, dependencyDecorator} from './ioc/decorators';
import {callable} from './ioc/create';
import {spawnWorker, workerContext} from './worker';
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

function transferHeadersToCtx(msg, ctx) {
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

    @config('name', 'The name of the queue.')
    queue

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
            description: `Queue for @publisher('${queue}')`,
            key: queue,
            path: [{key: 'queues', description: 'SQS configuration'}]
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

        transferHeadersToCtx(msg, workerCtx);

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

    @logger
    log

    @config('name', 'The name of the queue.')
    queue

    constructor() {
        this.queueUrl = null;
        this.stopped = false;
        this.pollingTask = null;
    }

    async ensureQueueExists() {
        this.queueUrl = await getQueueUrl(this.queue, this.sqs);
    }

    async start() {
        let {log} = this;

        log.debug`starting consumer`;
        await this.ensureQueueExists();

        this.pollingTask = this.pollMessages();

        log.debug`consumer started`;
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
            let messages;

            try {
                messages = await this.fetchMessages();
            } catch (err) {
                log.error`error fetching messages: ${err} `;
                continue;
            }

            log.debug`processing messages ${messages.length} from ${queue}`;

            for (let msg of messages) {
                this.processMessage(msg, queueUrl);
            }
        }

        log.debug`stopped polling`;
    }

    async stop() {
        let {log} = this;

        log.debug`stopping consumer`;
        this.stopped = true;
        this.sqs.stop();
        await this.pollingTask;
        log.debug`consumer stopped`;
    }
}

export function consumer(queue) {
    return methodDecorator(consumer, {
        dependencyClass: Consumer,
        constructorArgs: [queue],
        config: {
            path: [{key: 'queues', description: 'SQS configuration'}],
            description: `Queue for @consumer('${queue}')`,
            key: queue
        }
    });
}
