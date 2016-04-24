import {describe, it, expect, beforeEach} from '../testing';
import {getBoundObject} from 'nuss/ioc/create';
import {publisher} from 'nuss/aws';
import {createTestHandler} from 'nuss/testing';


const PUBLISHER_CONFIG = {
    queues: {
        'spam-queue': {
            name: 'aws-queue-name'

        }
    }
};

describe('@publisher()', ()=> {

    class Service {
        @publisher('spam-queue')
        publish

        async spam(msg) {
            await this.publish(msg);
        }
    }

    let service = null;
    let sqs = null;
    let workerCtx = null;

    beforeEach(()=> {
        service = createTestHandler(Service, PUBLISHER_CONFIG);

        ({workerCtx, sqs} = getBoundObject(service.publish));

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
        workerCtx.getHeader.returns('trace-id');

        await service.spam('ham & eggs');

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
