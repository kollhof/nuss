import {describe, it, expect, spy, stub, match} from '../testing';
import {createTestSubjects} from 'nuss/testing';

import {nodeServer, CONNECTION_TIMEOUT} from 'nuss/http/node-server';


const LISTENING_CALLBACK = 1;
const CLOSED_CALLBACK = 0;
const CONNECTION_CALLBACK = 1;
const TIMEOUT_CALLBACK = 1;
const PORT = 8080;

class HttpServer {
    @nodeServer
    server
}

describe('@nodeServer()', ()=> {
    let subjects = createTestSubjects(HttpServer);
    let [{server}] = subjects(HttpServer);

    let mockServer = {
        on: stub(),
        listen: stub(),
        close: stub()
    };
    let conn = {
        on: spy(),
        setTimeout: stub(),
        destroy() {
            // pretend the connection closed
            this.on.callArg(1);
        }
    };
    server.createServer = stub().returns(mockServer);


    it('should listen and manage connections', async ()=> {
        mockServer.listen
            .withArgs(PORT)
            .callsArgAsync(LISTENING_CALLBACK);

        mockServer.on
            .withArgs('connection')
            .callsArgWithAsync(CONNECTION_CALLBACK, conn);

        let reqHandler = {};

        await server.listen(PORT, reqHandler);

        expect(server.createServer)
            .to.have.been
            .calledOnce
            .calledWithExactly(reqHandler);

        expect(mockServer.listen)
            .to.have.been
            .calledOnce
            .calledWithExactly(PORT, match.func);

        expect(server.connections.size).to.equal(1);
    });

    it('should stop and close connections', async ()=> {
        mockServer.close.callsArgAsync(CLOSED_CALLBACK);
        conn.setTimeout
            .withArgs(CONNECTION_TIMEOUT)
            .callsArgAsync(TIMEOUT_CALLBACK);

        await server.close();

        expect(server.connections.size).to.equal(0);
    });
});
