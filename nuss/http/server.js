import {dependencyDecorator} from '../ioc/decorators';
import {shared} from '../ioc/shared';
import {factory} from '../ioc/create';
import {logger} from '../logging';
import {config} from '../config';

import {nodeServer} from './node-server';

import {Router} from 'express';
import finalhandler from 'finalhandler';

export const DEFAULT_PORT = 8080;

export class HttpServer {
    @shared(Map)
    servers

    @nodeServer
    server

    @logger
    log

    @config('The base URL for all routes.')
    rootUrl='/'

    @config('The port to listen on.')
    port=DEFAULT_PORT

    constructor() {
        this.started = null;
        this.stopped = null;
        this.router = new Router();
    }

    addRoute(verb, route, requestHandler) {
        this.log.debug`registering request handler for route ${route}`;
        this.router[verb](route, requestHandler);
    }

    async start() {
        if (this.started === null) {
            this.started = this.startServer();
        } else {
            this.log.debug`server already starting`;
        }

        await this.started;
    }

    async stop() {
        if (this.stopped === null) {
            this.stopped = this.stopServer();
        } else {
            this.log.debug`server already stopping`;
        }

        await this.stopped;
    }

    async startServer() {
        let {log, port, rootUrl, server} = this;

        log.debug`starting server`;

        let base = new Router({strict: true});

        base.use(rootUrl, this.router);

        await server.listen(this.port, (req, resp)=> {
            let done = finalhandler(req, resp);
            base.handle(req, resp, done);
        });

        log.debug`server listening at ${`localhost:${port}${rootUrl}`}`;
    }

    async stopServer() {
        let {log, servers, server} = this;

        // TODO: why ?
        servers.delete(this.port);

        log.debug`stopping server`;

        await server.close();
        log.debug`stopped server`;
    }

    @factory
    getSharedServer() {
        let {port, servers} = this;

        let server = servers.get(port);

        if (server === undefined) {
            servers.set(port, this);
            return this;
        }
        return server;
    }
}

export function httpServer(proto, name, descr) {
    return dependencyDecorator(httpServer, {
        dependencyClass: HttpServer,
        config: [{
            root: true,
            key: 'http',
            description: 'HTTP-server configuration for @http()'
        }]
    })(proto, name, descr);
}
