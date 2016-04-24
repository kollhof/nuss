import {describe, it, expect} from './testing';
import {createTestEntrypoints} from 'nuss/testing';

import {callable} from 'nuss/ioc/create';
import {methodDecorator} from 'nuss/ioc/decorators';
import {worker, workerContext} from 'nuss/worker';
import {handler} from 'nuss/handler';


class SpamWorker {
    @workerContext
    ctx

    @handler
    invokeServiceHandler

    @callable
    processSpam(ham) {
        this.ctx.setHeader('spam', ham);

        let msg = `${ham} & eggs`;
        return this.invokeServiceHandler(msg);
    }
}

class Spam {
    @worker(SpamWorker)
    customSpam

    @worker
    defaultSpam
}

function spam(proto, name, descr) {
    return methodDecorator(spam, {
        dependencyClass: Spam
    })(proto, name, descr);
}


class Service {
    @workerContext
    ctx

    @spam
    handleSpam(msg) {
        return [msg, this.ctx.getHeader('spam')];
    }
}


describe('@worker(), @workerContext()', ()=> {
    let [spammer] = createTestEntrypoints(Service);

    it('should invoke service handler method via default worker', ()=> {
        let [msg, ctxValue] = spammer.defaultSpam('ni');

        expect(msg).to.equal('ni');
        expect(ctxValue).to.equal(undefined);
    });

    it('should invoke service handler method via custom worker', ()=> {
        let [msg, ctxValue] = spammer.customSpam('ham');

        expect(msg).to.equal('ham & eggs');
        expect(ctxValue).to.equal('ham');
    });
});

