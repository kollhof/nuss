import {describe, it, expect, beforeEach, stub, match} from '../testing';
import {createTestSubjects} from 'nuss/testing';

import {asyncSQS} from 'nuss/aws/sqs';

const CALLBACK=1;

let testOptions = {
    config: {

    }
};

class Foobar {
    @asyncSQS
    asyncSQS
}


describe('@asyncSQS()', ()=> {
    let asqs = null;

    let sqs = {
        receiveMessage: stub()
    };

    let req = {
        abort: stub()
    };

    beforeEach(()=> {
        let subjects = createTestSubjects(Foobar, testOptions);
        let [foobar] = subjects(Foobar);
        asqs = foobar.asyncSQS;

        asqs.SQSClass = stub().returns(sqs);
        sqs.receiveMessage = stub();
    });

    it('should receive messages', async ()=> {
        sqs.receiveMessage
            .returns(req)
            .callsArgWithAsync(CALLBACK, undefined, 'spam');

        let data = await asqs.receiveMessage('foobar');

        expect(sqs.receiveMessage)
            .to.have.been
            .calledOnce
            .calledWithExactly('foobar', match.func);

        expect(data).to.deep.equal('spam');
    });

    it('should abort outstanding receive requests', async ()=> {
        let abortError = new Error('abort');

        sqs.receiveMessage.returns(req);

        let task = asqs.receiveMessage('foobar');

        await asqs.stop();

        expect(req.abort)
            .to.have.been
            .calledOnce
            .calledWithExactly();

        // an abort would cause any outstanding requests to error
        sqs.receiveMessage.callArgWith(CALLBACK, abortError);

        try {
            await task;
        } catch (err) {
            expect(err).to.equal(abortError);
            return;
        }
        expect.fail();
    });
});
