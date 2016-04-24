import {methodDecorator} from '../ioc/decorators';
import {callable} from '../ioc/create';

import {worker, workerContext} from '../worker';
import {handler} from '../handler';
import {logger} from '../logging';
import {config} from '../config';
import {TasksAndIO, all, TaskSet} from '../async';

import {asyncSQS, getQueueUrl} from './sqs';


function transferHeadersToCtx(msg, ctx) {
    let attrs = msg.MessageAttributes;

    if (attrs === undefined) {
        return;
    }

    for (let key of ['trace']) {
        let val = attrs[key];
        ctx.setHeader(key, val.StringValue);
    }
}

export class MessageWorker {
    @logger
    log

    @workerContext
    workerCtx

    @handler
    handle

    @callable
    async processMessage(msg, sqs, queueUrl) {
        let {log, workerCtx, handle} = this;

        log.debug`processing msg ${msg.MessageId}`;

        transferHeadersToCtx(msg, workerCtx);

        try {
            await handle(msg.Body);
        } catch (err) {
            log.error`worker ${err.stack}`;
            // TODO: throw err; ?
            return;
        }

        log.debug`deleting msg ${msg.MessageId}`;

        await sqs.deleteMessage({
            QueueUrl: queueUrl,
            ReceiptHandle: msg.ReceiptHandle
        });
    }
}

class Consumer {
    @asyncSQS
    sqs

    @worker(MessageWorker)
    processMessage

    @logger
    log

    @config('name', 'The name of the queue.')
    queue

    constructor() {
        this.queueUrl = null;
        this.stopped = false;
        this.activeTasks = new TaskSet();
    }

    async ensureQueueExists() {
        this.queueUrl = await getQueueUrl(this.queue, this.sqs);
    }

    async start() {
        let {log, activeTasks} = this;

        log.debug`starting consumer`;
        await this.ensureQueueExists();

        let pollingTask = this.pollMessages();
        activeTasks.add(pollingTask);

        log.debug`consumer started`;
    }

    async fetchMessages() {
        let {log, queueUrl, sqs} = this;

        log.debug`fetching messages from ${this.queue}`;

        try {
            let data = await sqs.receiveMessage({
                QueueUrl: queueUrl,
                WaitTimeSeconds: 10,
                MaxNumberOfMessages: 10,
                MessageAttributeNames: ['trace']  // TODO: get names from ctx
            });
            return data.Messages || [];
        } catch (err) {
            if (!this.stopped) {
                log.error`error fetching messages: ${err} `;
            }
        }

        return [];
    }

    async pollMessages() {
        let {log, queue, queueUrl, sqs, activeTasks} = this;

        log.debug`start polling`;

        while (!this.stopped) {
            // If fetchMessages() has failed without waiting on IO
            // we could end up in an endless tight loop of promises.
            // To avoid it we explicitly get out of it by:
            await TasksAndIO;

            let messages = await this.fetchMessages();

            log.debug`processing messages ${messages.length} from ${queue}`;

            for (let msg of messages) {
                // TODO: should probably manage a task-set
                // and await it during stop()
                // Though a container would usually manage that.
                let task = this.processMessage(msg, sqs, queueUrl);
                activeTasks.add(task);
            }
        }

        log.debug`stopped polling`;
    }

    async stop() {
        let {log, sqs, activeTasks} = this;

        log.debug`stopping consumer`;
        this.stopped = true;
        sqs.stop();
        await all(activeTasks);
        log.debug`consumer stopped`;
    }
}

export function consumer(queue) {
    return methodDecorator(consumer, {
        dependencyClass: Consumer,
        constructorArgs: [queue],
        config: [
            {key: 'consumer', optional: true},
            {key: 'queues', description: 'SQS configuration'},
            {key: queue, description: `Queue for @consumer('${queue}')`}
        ]
    });
}

