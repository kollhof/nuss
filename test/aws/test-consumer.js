import {describe, it, expect, beforeEach, afterEach, stub} from '../testing';
import {createTestSubjects, spyCalled} from 'nuss/testing';
import {workerContext} from 'nuss/worker';

import {consumer} from 'nuss/aws';
import {asyncSQS} from 'nuss/aws/sqs';

let spam = stub();
let spamCtx = stub();

let testOptions = {
    config: {
        queues: {
            'spam-queue': {
                name: 'aws-queue-name'
            }
        }
    }
};

class Service {
    @workerContext
    ctx

    @consumer('spam-queue')
    async spam(...args) {
        spamCtx(this.ctx.getHeader('trace'));
        await spam(...args);
    }
}

describe('@consumer()', ()=> {
    let sqs = null;
    let subjects = null;

    beforeEach(async ()=> {
        spam = stub();
        spamCtx = stub();
        subjects = createTestSubjects(Service, testOptions);
        [sqs] = subjects(asyncSQS);

        sqs.getQueueUrl.returns({QueueUrl: 'test-queue-url'});
    });

    afterEach(async ()=> {
        await subjects.stop();
    });

    async function messagesReceived() {
        await subjects.start();
        await spyCalled(sqs.receiveMessage);
        await subjects.stop();
    }


    it('should start and stop polling messages', async ()=> {
        await messagesReceived();

        expect(sqs.receiveMessage)
            .to.have.been
            .always.calledWithExactly({
                MaxNumberOfMessages: 10,
                MessageAttributeNames: ['trace'],
                QueueUrl: 'test-queue-url',
                WaitTimeSeconds: 10
            });
    });

    it('should delete message after handled by service', async ()=> {
        sqs.receiveMessage
            .onFirstCall().returns({
                Messages: [{
                    ReceiptHandle: 'spam-receipt',
                    Body: 'ham & eggs'
                }]
            });

        await messagesReceived();

        expect(spam)
            .to.have.been
            .calledOnce
            .calledWithExactly('ham & eggs');

        expect(sqs.deleteMessage)
            .to.have.been
            .calledOnce
            .calledWithExactly({
                QueueUrl: 'test-queue-url',
                ReceiptHandle: 'spam-receipt'
            });
    });

    it('should not delete message if handler throws', async ()=> {
        sqs.receiveMessage
            .onFirstCall().returns({
                Messages: [{
                    Body: 'ham & eggs'
                }]
            });
        spam.throws(new Error('unable to handle message'));

        await messagesReceived();

        expect(spam)
            .to.have.been
            .calledOnce
            .calledWithExactly('ham & eggs');

        //TODO: should call something like sqs.handleUnhandledMessage()
        expect(sqs.deleteMessage)
            .to.have.been
            .callCount(0);
    });

    it('should transfer headers to workerContext', async ()=> {
        sqs.receiveMessage
            .onFirstCall().returns({
                Messages: [{
                    MessageAttributes: {
                        trace: {
                            DataType: 'String',
                            StringValue: 'trace-id'
                        }
                    },
                    Body: 'ham & eggs'
                }]
            });

        await messagesReceived();

        expect(spamCtx)
            .to.have.been
            .calledOnce
            .calledWithExactly('trace-id');
    });

    it('should ignore error during message fetching', async ()=> {
        sqs.receiveMessage
            .onFirstCall().throws(new Error('network error'));

        sqs.receiveMessage
            .onSecondCall().returns({});

        sqs.receiveMessage
            .onThirdCall().returns({
                Messages: [{
                    Body: 'ham & eggs'
                }]
            });

        await messagesReceived();

        expect(spam)
            .to.have.been
            .calledOnce
            .calledWithExactly('ham & eggs');
    });
});
