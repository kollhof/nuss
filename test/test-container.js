import {describe, it, expect, beforeEach, stub, spy} from './testing';
import {SomeRejected, sleep} from 'nuss/async';
import {methodDecorator} from 'nuss/ioc/decorators';
import {container} from 'nuss/container';
import {worker} from 'nuss/worker';


let spamStarting = stub();
let spamStopping = stub();

class Spam {
    @worker
    process

    async start() {
        spamStarting(this);
    }

    async stop() {
        spamStopping();
    }

    handleMessage(msg) {
        return this.process(msg);
    }
}

function spam(proto, name, descr) {
    return methodDecorator(spam, {
        dependencyClass: Spam
    })(proto, name, descr);
}


class Service {
    @spam
    async sleep(msg) {
        await sleep(1);
        return [this, msg];
    }

    @spam
    async throwError(msg) {
        throw new Error(msg);
    }
}

class Application {
    @container
    container
}

const NUM_HANDLERS = 2;


describe('@container()', ()=> {
    let app = null;

    beforeEach(()=> {
        spamStarting.reset();
        spamStarting.onCall(0).returns();

        spamStopping.reset();
        spamStopping.onCall(0).returns();

        app = new Application();
    });

    it('should wait for all entrypoints to start', async ()=> {
        await app.container.start(Service);

        expect(spamStarting)
            .to.have
            .callCount(NUM_HANDLERS);
    });

    it('should wait for all entrypoints and fail, if any failed', async ()=> {
        let err = new Error('failed to start Spam');
        spamStarting.onCall(0).throws(err);

        try {
            await app.container.start(Service);
        } catch (startErr) {
            expect(startErr).to.be.instanceOf(SomeRejected);
            expect(startErr.errors).to.deep.equal([err]);
        }

        expect(spamStarting)
            .to.have
            .callCount(NUM_HANDLERS);
    });

    it('should wait for entrypoints to stop', async ()=> {
        await app.container.start(Service);
        await app.container.stop();

        expect(spamStopping)
            .to.have
            .callCount(NUM_HANDLERS);
    });

    it('should ignore failing entrypoints during stop', async ()=> {
        let err = new Error('failed to stop Spam');
        spamStopping.onCall(0).throws(err);

        await app.container.start(Service);
        await app.container.stop();

        expect(spamStopping)
            .to.have
            .callCount(NUM_HANDLERS);
    });

    it('should wait for all worker tasks to finish when stopping', async ()=> {
        let taskCompleted = spy();
        let containerStopped = spy();

        await app.container.start(Service);
        let [spammer] = spamStarting.getCall(0).args;

        spammer.handleMessage('foobar')
            .then(taskCompleted);

        await app.container.stop()
            .then(containerStopped);

        expect(taskCompleted)
            .to.have.been
            .calledBefore(containerStopped);

        expect(spamStopping)
            .to.have
            .callCount(NUM_HANDLERS);
    });

    it('should ignore failing worker tasks when stopping', async ()=> {
        let taskThrew = spy();
        let containerStopped = spy();

        await app.container.start(Service);
        let [spammer] = spamStarting.getCall(1).args;

        spammer.handleMessage('invalid message')
            .catch(taskThrew);

        await app.container.stop()
            .then(containerStopped);

        expect(taskThrew)
            .to.have.been
            .calledBefore(containerStopped);

        expect(spamStopping)
            .to.have
            .callCount(NUM_HANDLERS);
    });

    it('should create new handler instances for worker calls', async ()=> {
        await app.container.start(Service);
        let [spammer] = spamStarting.getCall(0).args;

        let [serviceInstance1, msg1] = await spammer.handleMessage('spam');
        let [serviceInstance2, msg2] = await spammer.handleMessage('ham');

        expect(serviceInstance1).to.not.equal(serviceInstance2);
        expect(msg1).to.equal('spam');
        expect(msg2).to.equal('ham');
    });
});
