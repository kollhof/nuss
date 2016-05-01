import {createRequest, createResponse} from 'node-mocks-http';

import {describe, it, expect, spy, stub, match} from '../testing';
import {createTestSubjects, spyCalled} from 'nuss/testing';

import {http, INTERNAL_SERVER_ERROR} from 'nuss/http';
import {httpServer} from 'nuss/http/server';
import {nodeServer} from 'nuss/http/node-server';


const REQUEST_HANDLER = 1;

const TEST_PORT = 1234;

let testOptions = {
    config: {
        http: {
            rootUrl: '/test/root',
            port: TEST_PORT
        }
    },
    exclude: [httpServer]
};


let handleSpam = stub();
let handleHam = stub();

class Service {
    @http('/spam')
    async handleSpam(req, resp) {
        handleSpam(req, resp);
    }

    @http('/ham')
    async handleHam(req, resp) {
        handleHam(req, resp);
    }
}


describe('@http()', ()=> {
    let subjects = createTestSubjects(Service, testOptions);
    let [nodeSrv] = subjects(nodeServer);
    let [httpServer1, httpServer2] = subjects(httpServer);

    it('should share a single httpServer', ()=> {
        expect(httpServer1).to.equal(httpServer2);
    });

    it('should start and stop nodeSrv once each', async ()=> {
        await subjects.start();
        expect(nodeSrv.listen)
            .to.have.been
            .calledOnce
            .calledWithExactly(TEST_PORT, match.func);

        await subjects.stop();
        expect(nodeSrv.close)
            .to.have.been
            .calledOnce
            .calledWithExactly();
    });

    it('should process requests calling service handler', async ()=> {
        let req = createRequest({
            method: 'GET',
            url: '/test/root/spam'
        });

        let resp = createResponse();

        await subjects.start();
        nodeSrv.listen.callArgWith(REQUEST_HANDLER, req, resp);

        expect(handleSpam)
            .to.have.been
            .calledOnce
            .calledWithExactly(req, resp);
    });

    it('should send INTERNAL_SERVER_ERROR if handler throws', async ()=> {
        let err = new Error('handling request');
        handleSpam.throws(err);

        let req = createRequest({
            method: 'GET',
            url: '/test/root/spam'
        });

        // TODO: use createRequest
        let resp = {
            send: spy(),
            status: spy()
        };

        await subjects.start();
        nodeSrv.listen.callArgWith(REQUEST_HANDLER, req, resp);
        //TODO: should call spamRoute.stop() to have it wait for req processing
        //to complete
        await spyCalled(resp.send);

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
