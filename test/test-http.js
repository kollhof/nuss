import {describe, it, expect} from './testing';
import {createMocked} from 'nuss/testing';
import {HttpRoute, http} from 'nuss/http';
import {sleep} from 'nuss/async';
import {getDecoratedMethods} from 'nuss/ioc/decorators';



describe('HttpRoute()', ()=> {
    it('should ', async ()=> {

        let httpRoute = createMocked(HttpRoute, '/foobar/spam');

        expect(httpRoute.server.addRoute)
            .to.have.been.calledWithMatch('get', '/foobar/spam', ()=> true)
            .once;

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
