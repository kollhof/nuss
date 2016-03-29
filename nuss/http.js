import {methodDecorator, dependencyDecorator} from './ioc/decorators';
import {spawnWorker} from './container';
import {logger} from './ctxlogger';
import {config} from './config';

import express, {Router} from 'express';


const GET='get';


class HttpServer {
    @logger
    log

    @config('rootUrl')
    rootUrl

    @config('port')
    port

    constructor() {
        this.started = null;
        this.stopped = null;
        this.server = null;

        this.router = new Router();
        this.app = express();
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
        let {log, port, rootUrl, app} = this;

        log.debug`starting server`;

        app.use(rootUrl, this.router);
        await new Promise((resolve)=> {
            this.server = app.listen(port, resolve);
        });

        log.debug`server listening at 'localhost:${port}${rootUrl}'`;
    }

    async stopServer() {
        this.log.debug`stopping server`;
        await new Promise((resolve)=>
            this.server.close(resolve));
        this.log.debug`stopped server`;
    }
}

const SHARED_BY_PROCESS = Symbol('shared-by-process');

function httpServer(...args) {
    return dependencyDecorator(httpServer, {
        dependencyClass: HttpServer,
        constructorArgs: [],
        sharingKey: ()=> SHARED_BY_PROCESS
    })(...args);
}

const INTERNAL_SERVER_ERROR = 500;

class HttpRoute {
    @httpServer
    server

    @logger
    log

    @spawnWorker
    spawnWorker

    constructor(route) {
        this.server
            .addRoute(GET, route, (...args)=> this.handleRequest(...args));
    }

    handleRequest(req, resp) {
        this.spawnWorker((handler, workerCtx)=> {
            this.handleRequestWorker(handler, workerCtx, req, resp);
        });
    }

    async handleRequestWorker(handler, workerCtx, req, resp) {
        let {log} = this;

        workerCtx.setHeader('foobar', req.headers.foobar);
        workerCtx.setHeader('trace', req.headers.trace);

        try {
            await handler(req, resp);
        } catch (err) {
            log.error`${err} handling request`;
            resp.status(INTERNAL_SERVER_ERROR)
                .send(err.stack);
        }

        this.log.debug`http end`;
    }

    async start() {
        await this.server.start();
    }

    async stop() {
        this.log.debug`stopping route`;
        await this.server.stop();
    }
}

export function http(route) {
    return methodDecorator(http, {
        dependencyClass: HttpRoute,
        constructorArgs: [route]
    });
}

