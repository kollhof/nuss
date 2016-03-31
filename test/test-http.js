import {describe, it, expect, spy} from './testing';
import {HttpRoute, http} from 'nuss/http';
import {sleep} from 'nuss/async';
import {getDecoratedMethods} from 'nuss/ioc/decorators';


describe('HttpRoute()', ()=> {
    it('should ', async ()=> {
        let httpRoute = new HttpRoute('/foobar/spam');

        httpRoute.spawnWorker = spy();
        httpRoute.server = {start: spy(), stop: spy()};
        httpRoute.log = {debug: spy()};

        await httpRoute.start();

        expect(httpRoute.server.start).to.have.been.called;
        httpRoute.spawnWorker.reset();

        await httpRoute.stop();
        expect(httpRoute.server.stop).to.have.been.called;
    });
});


describe('@http()', ()=> {
    class Foobar {

        @http('/foobar/spam');
        spam() {
            // nothing to do
        }
    }

    it('should decorate', ()=> {
        let [descr] = getDecoratedMethods(Foobar);

        expect(descr).to.deep.equal({
            decorator: http,
            decoratorDescr: {
                dependencyClass: HttpRoute,
                constructorArgs: ['/foobar/spam']
            },
            decoratedClass: Foobar,
            decoratedMethod: Foobar.prototype.spam,
            decoratedName: 'spam'
        });
    });
});
