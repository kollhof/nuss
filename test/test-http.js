import {describe, it, expect, match} from './testing';
import {createMocked} from 'nuss/testing';
import {HttpRoute, http, GET} from 'nuss/http';
import {getDecoratedMethods} from 'nuss/ioc/decorators';


describe('HttpRoute()', ()=> {
    let httpRoute = createMocked(HttpRoute, '/foobar/spam');
    let {server} = httpRoute;

    it('should register root with server', ()=> {

        expect(server.addRoute)
            .to.have.been
            .calledOnce
            .calledWithMatch(GET, '/foobar/spam', match.instanceOf(Function));

    });

    it('should start and stop server', ()=> {
        httpRoute.start();
        expect(httpRoute.server.start)
            .to.have.been
            .calledOnce
            .calledWithExactly();

        httpRoute.stop();
        expect(httpRoute.server.stop)
            .to.have.been
            .calledOnce
            .calledWithExactly();
    });

    it('should spawn worker when server calls callback', ()=> {
        let req = {};
        let resp = {};

        let [, , handleReq] = server.addRoute.getCall(0).args;

        handleReq(req, resp);

        expect(httpRoute.handleRequest)
            .to.have.been
            .calledOnce
            .calledWithExactly(req, resp);

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
