import {methodDecorator, dependencyDecorator} from './ioc/decorators';
import {callable, factory} from './ioc/create';
import {worker, workerContext} from './worker';
import {logger} from './logging';
import {config} from './config';

import {createServer} from 'http';

import express, {Router} from 'express';


export const GET = 'get';
export const INTERNAL_SERVER_ERROR = 500;

export const CONNECTION_TIMEOUT = 10;
export const DEFAULT_PORT = 8080;

// TODO: should this map come from the container?
export const SERVERS = new Map();


export class HttpServer {
    // TODO: should be an injected shared Map provided by the container
    // this would allow the container to delete the object when it dies
    // instead of using a module local object that may never get cleaned up
    servers=SERVERS

    // TODO: should probably wrap node's server to make it injectable
    // and help with testing
    createServer=createServer

    // TODO: wrap make injectable
    express=express

    @logger
    log

    @config('The base URL for all routes.')
    rootUrl='/'

    @config('The port to listen on.')
    port=DEFAULT_PORT

    constructor() {
        this.started = null;
        this.stopped = null;
        this.server = null;
        this.router = new Router();
        this.connections = new Set();
    }

    addRoute(verb, route, handler) {
        this.log.debug`registering handler for route ${route}`;
        this.router[verb](route, handler);
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

    async start() {
        if (this.started !== null) {
            this.log.debug`server already starting`;
            await this.started;
            return;
        }

        this.started = this.startServer();
        await this.started;
    }

    async stop() {
        if (this.stopped !== null) {
            this.log.debug`server already stopping`;
            await this.stopped;
            return;
        }

        this.stopped = this.stopServer();
        await this.stopped;
    }

    async startServer() {
        let {log, port, rootUrl} = this;

        log.debug`starting server`;

        // TODO: express and createServer need to be injected properly
        let app = this.express();
        app.use(rootUrl, this.router);

        this.server = this.createServer(app);
        this.server.on('connection', (conn)=> this.manageConnection(conn));

        await new Promise((resolve)=> {
            this.server.listen(this.port, resolve);
        });

        log.debug`server listening at 'localhost:${port}${rootUrl}'`;
    }

    async stopServer() {
        let {log, servers} = this;

        servers.delete(this.port);

        log.debug`stopping server`;

        await new Promise((resolve)=> {
            this.server.close(resolve);
            this.closeConnections();
        });
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
            description: 'HTTP-server config for @http()'
        }]
    })(proto, name, descr);
}


export class RequestWorker {
    @logger
    log

    @workerContext
    workerCtx;

    constructor(req, resp) {
        this.req = req;
        this.resp = resp;
    }

    @callable
    async work(handler) {
        let {log, workerCtx, req, resp} = this;

        log.debug`applying request headers to worker context`;
        workerCtx.setHeader('trace', req.headers.trace);

        try {
            await handler(req, resp);
        } catch (err) {
            log.error`${err} handling request`;
            resp.status(INTERNAL_SERVER_ERROR);

            // TODO: security risk!
            resp.send(err.stack);
        }

        log.debug`http request handled`;
    }
}

export class HttpRoute {
    @logger
    log

    @httpServer
    server

    @worker(RequestWorker)
    handleRequest

    constructor(route) {
        this.server
            .addRoute(GET, route, (...args)=> this.handleRequest(...args));
    }

    async start() {
        await this.server.start();
    }

    async stop() {
        await this.server.stop();
    }
}

export function http(route) {
    return methodDecorator(http, {
        dependencyClass: HttpRoute,
        constructorArgs: [route]
    });
}

