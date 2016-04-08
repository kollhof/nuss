import {describe, it, expect} from './testing';
import {createMocked} from 'nuss/testing';
import {HttpRoute, http, GET} from 'nuss/http';
import {getDecoratedMethods} from 'nuss/ioc/decorators';
import {match} from 'sinon';


describe('HttpRoute()', ()=> {
    let httpRoute = createMocked(HttpRoute, '/foobar/spam');
    let {server} = httpRoute;

    it('should register root with server', ()=> {

        expect(server.addRoute)
            .to.have.been
            .calledWithMatch(GET, '/foobar/spam', match.instanceOf(Function))
            .once;
    });

    it('should start and stop server', ()=> {
        httpRoute.start();
        expect(httpRoute.server.start).to.have.been.called;

        httpRoute.stop();
        expect(httpRoute.server.stop).to.have.been.called;
    });

    it('should spawn worker when server calls callback', ()=> {
        let req = {};
        let resp = {};

        let [, , handleReq] = server.addRoute.getCall(0).args;

        handleReq(req, resp);

        expect(httpRoute.handleRequest)
            .to.have.been.calledWith(req, resp)
            .once;
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
                constructorArgs: ['/foobar/spam'],
                config: {
                    description: 'Configuration for the HTTP-server',
                    key: 'http'
                }
            },
            decoratedClass: Foobar,
            decoratedMethod: Foobar.prototype.spam,
            decoratedName: 'spam'
        });
    });
});
