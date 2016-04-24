import {describe, it, beforeEach, expect, match, spy, stub} from './testing';
import {createMocked} from 'nuss/testing';
import {
    RequestWorker,
    HttpRoute, http, GET,
    HttpServer, httpServer,
    INTERNAL_SERVER_ERROR, CONNECTION_TIMEOUT
} from 'nuss/http';
import {getDecoratedMethods, getDecoratedProps} from 'nuss/ioc/decorators';
import {isCallable, isFactory} from 'nuss/ioc/create';

const TEST_PORT = 1234;
const SERVER_CONFIG = {
    rootUrl: '/test/root',
    port: TEST_PORT
};

let expressApp = {
    use: spy()
};

let nodeServer = {
    on: spy(),
    listen: spy(),
    close: spy()
};

let conn = {
    on: spy(),
    setTimeout: spy(),
    destroy: spy()
};

function createTestServer() {
    let server = createMocked(HttpServer, [], SERVER_CONFIG);

    // TODO: should probably be wrapped and injected properly
    server.express = stub().returns(expressApp);
    server.createServer = stub().returns(nodeServer);
    server.servers = new Map();
    server.router = {
        get: stub()
    };
    return server;
}

describe('HttpServer', ()=> {
    let server = createTestServer();

    // TODO: where are the resets for the stubs?

    it('should be a @factory', ()=> {
        expect(isFactory(HttpServer)).to.equal(true);
    });

    it('should use config', ()=> {
        expect(server.port).to.equal(TEST_PORT);
        expect(server.rootUrl).to.equal('/test/root');
    });

    it('should delegates addRoute to express Router', ()=> {
        let handler = {};

        server.addRoute(GET, '/spam', handler);

        expect(server.router.get)
            .to.have.been
            .calledOnce
            .calledWithExactly('/spam', handler);
    });

    it('should create node server and express app', async ()=> {
        server.start();
        let startTask = server.start();

        expect(expressApp.use)
            .to.have.been
            .calledOnce
            .calledWithExactly(server.rootUrl, server.router);

        expect(server.createServer)
            .to.have.been
            .calledOnce
            .calledWithExactly(expressApp);

        expect(nodeServer.listen)
            .to.have.been
            .calledWith(server.port);

        let [, onListening] = nodeServer.listen.getCall(0).args;

        onListening();

        await startTask;
    });

    it('should manage connections', ()=> {
        expect(nodeServer.on)
            .to.have.been
            .calledWithMatch('connection', match.instanceOf(Function));

        let [, onConnection] = nodeServer.on.getCall(0).args;
        onConnection(conn);

        expect(conn.on)
            .calledWithMatch('close', match.instanceOf(Function));
    });

    it('should stop and close connections', async()=> {
        server.stop();
        let stopTask = server.stop();

        expect(nodeServer.close)
            .to.have.been
            .calledWithMatch(match.instanceOf(Function));

        expect(conn.setTimeout)
            .to.have.been
            .calledWithMatch(CONNECTION_TIMEOUT, match.instanceOf(Function));

        let [onClosed] = nodeServer.close.getCall(0).args;
        onClosed();
        await stopTask;
    });

    it('should manage connection closing', ()=> {
        let [, connTimeout] = conn.setTimeout.getCall(0).args;
        connTimeout();
        expect(conn.destroy)
            .to.have.been
            .calledOnce
            .calledWithExactly();

        expect(server.connections.size).to.equal(1);
        let [, onClose] = conn.on.getCall(0).args;
        onClose();

        expect(server.connections.size).to.equal(0);
    });

    it('should create only on instance', ()=> {
        let srv1 = server.getSharedServer();
        let srv2 = server.getSharedServer();
        expect(srv1).to.equal(server);
        expect(srv2).to.equal(server);
    });
});


describe('@httpServer()', ()=> {
    class Foobar {
        @httpServer;
        spam
    }

    it('should decorate', ()=> {
        let [descr] = getDecoratedProps(Foobar);

        expect(descr).to.deep.equal({
            decorator: httpServer,
            decoratorDescr: {
                dependencyClass: HttpServer,
                config: [{
                    description: 'HTTP-server config for @http()',
                    key: 'http',
                    root: true
                }]
            },
            decoratedClass: Foobar,
            decoratedName: 'spam'
        });
    });
});


describe('RequestWorker()', ()=> {
    let req = {
        headers: {
            trace: 'spam'
        }
    };

    let resp = {
        status: spy(),
        send: spy()
    };

    let worker = null;

    beforeEach(()=> {
        worker = createMocked(RequestWorker, []);
    });

    it('should be a @callable', ()=> {
        expect(isCallable(RequestWorker)).to.equal(true);
    });

    it('should update worker ctx with headers', async ()=> {
        await worker.processRequest(req, resp);

        expect(worker.workerCtx.setHeader)
            .to.have.been
            .calledOnce
            .calledWithExactly('trace', 'spam');
    });

    it('should invoker handler with req, resp', async ()=> {
        await worker.processRequest(req, resp);

        expect(worker.handleRequest)
            .to.have.been
            .calledOnce
            .calledWithExactly(req, resp);
    });

    it('should send internal-server-error if handler throws', async ()=> {
        let err = new Error('oh no');
        worker.handleRequest.throws(err);

        await worker.processRequest(req, resp);

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

        let [, , processRequest] = server.addRoute.getCall(0).args;

        processRequest(req, resp);

        expect(httpRoute.processRequest)
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
