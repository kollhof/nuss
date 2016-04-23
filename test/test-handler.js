import {describe, it, expect} from './testing';
import {getEntrypoints} from 'nuss/testing';
import {methodDecorator} from 'nuss/ioc/decorators';
import {handler} from 'nuss/handler';


class Spam {
    @handler
    invokeHandler
}

function spam(proto, name, descr) {
    return methodDecorator(spam, {
        dependencyClass: Spam
    })(proto, name, descr);
}


class Service {
    @spam
    handleSpam(ham) {
        return [this, ham];
    }
}


describe('@handler()', ()=> {
    it('should create service instance and bind handler method', ()=> {
        let [spammer] = getEntrypoints(Service);

        let [serviceInstance, ham] = spammer.invokeHandler('ham');

        expect(serviceInstance).to.be.instanceOf(Service);
        expect(ham).to.equal('ham');
    });
});
