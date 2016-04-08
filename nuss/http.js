import {methodDecorator, dependencyDecorator} from './ioc/decorators';
import {callable} from './ioc/create';
import {spawnWorker, workerContext} from './worker';
import {logger} from './logging';
import {config} from './config';

import express, {Router} from 'express';


export const GET='get';


export class HttpServer {
    @logger
    log

    @config('rootUrl', 'The base URL for all routes.')
    rootUrl

    @config('port', 'The port to listen on.')
    port

    constructor() {
        this.started = null;
        this.stopped = null;
        this.server = null;
        this.router = new Router();
        this.app = express();
        this.connections = new Set();
    }

    addRoute(verb, route, handler) {
        this.log.debug`registering handler for route ${route}`;
        this.router[verb](route, handler);
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
        let {log, port, rootUrl, app, connections} = this;

        log.debug`starting server`;

        app.use(rootUrl, this.router);
        await new Promise((resolve)=> {
            this.server = app.listen(port, resolve);
            this.server.on('connection', (conn)=> {
                connections.add(conn);
                conn.on('close', ()=> connections.delete(conn));
            });
        });

        log.debug`server listening at 'localhost:${port}${rootUrl}'`;
    }

    async stopServer() {
        let {log} = this;

        log.debug`stopping server`;

        await new Promise((resolve)=> {
            this.server.close(resolve);
            for (let conn of this.connections) {
                conn.setTimeout(10, ()=> {
                    log.error`destryoing connection`;
                    conn.destroy();
                });
            }
        });
        log.debug`stopped server`;
    }
}

const SHARED_BY_PROCESS = Symbol('shared-by-process');

export function httpServer(...args) {
    return dependencyDecorator(httpServer, {
        dependencyClass: HttpServer,
        constructorArgs: [],
        sharingKey: ()=> SHARED_BY_PROCESS
    })(...args);
}

const INTERNAL_SERVER_ERROR = 500;

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
        workerCtx.setHeader('foobar', req.headers.foobar);
        workerCtx.setHeader('trace', req.headers.trace);

        try {
            await handler(req, resp);
        } catch (err) {
            log.error`${err} handling request`;
            resp.status(INTERNAL_SERVER_ERROR)
                .send(err.stack);
        }

        log.debug`http request handled`;
    }
}

export class HttpRoute {
    @httpServer
    server

    @spawnWorker(RequestWorker)
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
        constructorArgs: [route],
        config: {
            key: 'http',
            description: 'Configuration for the HTTP-server'
        }
    });
}

