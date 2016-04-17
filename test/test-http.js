import {describe, it, expect, match, spy} from './testing';
import {createMocked} from 'nuss/testing';
import {
    HttpRoute, http, GET, HttpServer, RequestWorker, INTERNAL_SERVER_ERROR
} from 'nuss/http';
import {getDecoratedMethods} from 'nuss/ioc/decorators';
import {isCallable, isFactory} from 'nuss/ioc/create';


describe('HttpServer', ()=> {
    const TEST_PORT = 1234;

    let config = {
        rootUrl: '/test/root',
        port: TEST_PORT
    };

    let server = createMocked(HttpServer, [], config);

    it('should be a @factory', ()=> {
        expect(isFactory(HttpServer)).to.equal(true);
    });

    it('should', ()=> {
        expect(server.port).to.equal(TEST_PORT);
        expect(server.rootUrl).to.equal('/test/root');
    });
});


describe('RequestWorker', ()=> {
    let req = {
        headers: {
            trace: 'spam'
        }
    };

    let resp = {
        status: spy(),
        send: spy()
    };

    let worker = createMocked(RequestWorker, [req, resp]);

    it('should be a @callable', ()=> {
        expect(isCallable(RequestWorker)).to.equal(true);
    });

    it('should update worker ctx with headers', async ()=> {
        let handler = spy();

        await worker.work(handler);

        expect(worker.workerCtx.setHeader)
            .to.have.been
            .calledOnce
            .calledWithExactly('trace', 'spam');
    });

    it('should invoker handler with req, resp', async ()=> {
        let handler = spy();

        await worker.work(handler);

        expect(handler)
            .to.have.been
            .calledOnce
            .calledWithExactly(req, resp);
    });

    it('should send internal-server-error if handler throws', async ()=> {
        let err = new Error('oh no');

        await worker.work(()=> {
            throw err;
        });

        expect(resp.status)
            .to.have.been
            .calledOnce
            .calledWithExactly(INTERNAL_SERVER_ERROR);
        expect(resp.send)
            .to.have.been
            .calledOnce
            .calledWithExactly(err.stack);
    });
});

describe('HttpRoute()', ()=> {
    let httpRoute = createMocked(HttpRoute, ['/foobar/spam']);
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
