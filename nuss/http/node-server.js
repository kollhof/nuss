import {dependencyDecorator} from '../ioc/decorators';
import {logger} from '../logging';

import {createServer} from 'http';


export const CONNECTION_TIMEOUT = 10;


class NodeServer {
    createServer=createServer;

    @logger
    log

    constructor() {
        this.connections = new Set();
    }

    manageConnection(conn) {
        let {connections} = this;

        connections.add(conn);
        conn.on('close', ()=> connections.delete(conn));
    }

    closeConnections() {
        let {log, connections} = this;

        for (let conn of connections) {
            conn.setTimeout(CONNECTION_TIMEOUT, ()=> {
                log.error`destryoing connection`;
                conn.destroy();
            });
        }
    }

    async listen(port, app) {
        let server = this.createServer(app);
        this.server = server;

        server.on('connection', (conn)=> this.manageConnection(conn));

        await new Promise((resolve)=> {
            server.listen(port, resolve);
        });
    }

    async close() {
        await new Promise((resolve)=> {
            this.server.close(resolve);
            this.closeConnections();
        });
    }
}

export function nodeServer(proto, name, descr) {
    dependencyDecorator(nodeServer, {
        dependencyClass: NodeServer
    })(proto, name, descr);
}
