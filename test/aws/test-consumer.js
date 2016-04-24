import {describe, it, expect, beforeEach, afterEach, stub} from '../testing';
import {consumer} from 'nuss/aws';
import {createTestEntrypoints, spyCalled} from 'nuss/testing';
import {workerContext} from 'nuss/worker';


const CONSUMER_CONFIG = {
    queues: {
        'spam-queue': {
            name: 'aws-queue-name'

        }
    }
};


describe('@consumer()', ()=> {
    let spam = stub();
    let spamCtx = stub();
    let testConsumer = null;
    let sqs = null;

    class Service {
        @workerContext
        ctx

        @consumer('spam-queue')
        async spam(...args) {
            spamCtx(this.ctx.getHeader('trace'));
            await spam(...args);
        }
    }

    beforeEach(async ()=> {
        spam = stub();
        spamCtx = stub();

        [testConsumer] = createTestEntrypoints(Service, CONSUMER_CONFIG);
        ({sqs} = testConsumer);

        sqs.getQueueUrl.returns({QueueUrl: 'test-queue-url'});
    });

    afterEach(async ()=> {
        await testConsumer.stop();
    });


    it('should start and stop polling messages', async ()=> {
        await testConsumer.start();
        await spyCalled(sqs.receiveMessage);
        await testConsumer.stop();

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

        await testConsumer.start();
        await spyCalled(sqs.receiveMessage);
        await testConsumer.stop();

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

        await testConsumer.start();
        await spyCalled(sqs.receiveMessage);
        await testConsumer.stop();

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

        await testConsumer.start();
        await spyCalled(sqs.receiveMessage);
        await testConsumer.stop();

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

        await testConsumer.start();
        await spyCalled(sqs.receiveMessage);
        await testConsumer.stop();

        expect(spam)
            .to.have.been
            .calledOnce
            .calledWithExactly('ham & eggs');
    });
});
