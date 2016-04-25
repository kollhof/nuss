import {describe, it, expect, beforeEach} from '../testing';
import {createTestSubjects} from 'nuss/testing';
import {workerContext} from 'nuss/worker';

import {publisher} from 'nuss/aws';
import {asyncSQS} from 'nuss/aws/sqs';


const testOptions = {
    config: {
        queues: {
            'spam-queue': {
                name: 'aws-queue-name'
            }
        }
    }
};

class Service {
    @publisher('spam-queue')
    publish

    @workerContext
    ctx

    async spam(msg, headers={}) {
        // TODO: unsupported interface
        this.ctx.headers = headers;
        await this.publish(msg);
    }
}

describe('@publisher()', ()=> {
    let service = null;
    let sqs = null;

    beforeEach(()=> {
        let subjects = createTestSubjects(Service, testOptions);

        [service] = subjects(Service);
        [sqs] = subjects(asyncSQS);

        sqs.getQueueUrl.returns({QueueUrl: 'test-queue-url'});
    });


    it('should send message to sqs', async ()=> {
        await service.spam('ham & eggs');

        expect(sqs.getQueueUrl)
            .to.have.been
            .calledOnce
            .calledWithExactly({QueueName: 'aws-queue-name'});

        expect(sqs.sendMessage)
            .to.have.been
            .calledOnce
            .calledWithExactly({
                MessageAttributes: {},
                MessageBody: '"ham & eggs"',
                QueueUrl: 'test-queue-url'
            });
    });

    it('should include headers from worker-context', async ()=> {
        await service.spam('ham & eggs', {trace: 'trace-id'});

        expect(sqs.sendMessage)
            .to.have.been
            .calledOnce
            .calledWithExactly({
                MessageAttributes: {
                    trace: {
                        DataType: 'String',
                        StringValue: 'trace-id'
                    }
                },
                MessageBody: '"ham & eggs"',
                QueueUrl: 'test-queue-url'
            });
    });
});
