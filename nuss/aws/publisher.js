import {dependencyDecorator} from '../ioc/decorators';
import {callable} from '../ioc/create';

import {workerContext} from '../worker';
import {logger} from '../logging';
import {config} from '../config';

import {asyncSQS} from './sqs';


class Publisher {
    @asyncSQS
    sqs

    @logger
    log

    @workerContext
    workerCtx

    @config('name', 'The name of the queue.')
    queue

    @callable
    async publish(msg) {
        let {log, workerCtx, sqs} = this;

        log.debug`publish ${msg} -> ${this.queue}`;
        let queueUrl = await sqs.getQueueUrl({QueueName: this.queue});

        let attrs = {};

        // TODO: move to function
        for (let key of ['trace']) {
            let val = workerCtx.getHeader(key);

            if (val !== undefined) {
                attrs[key] = {
                    DataType: 'String',
                    StringValue: `${val}`
                };
            }
        }

        return await sqs.sendMessage({
            QueueUrl: queueUrl.QueueUrl,
            MessageAttributes: attrs,
            MessageBody: JSON.stringify(msg)
        });
    }
}

export function publisher(queue) {
    return dependencyDecorator(publisher, {
        dependencyClass: Publisher,
        constructorArgs: [queue],
        config: [
            {key: 'publisher', optional: true},
            {key: 'queues', description: 'SQS configuration'},
            {key: queue, description: `Queue for @publisher('${queue}')`}
        ]
    });
}
