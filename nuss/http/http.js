import {methodDecorator} from '../ioc/decorators';
import {callable} from '../ioc/create';
import {worker, workerContext} from '../worker';
import {handler} from '../handler';
import {logger} from '../logging';

import {httpServer} from './server';


export const GET = 'get';
export const INTERNAL_SERVER_ERROR = 500;


export class RequestHanlder {
    @logger
    log

    @handler
    handleRequest

    @workerContext
    workerCtx;

    @callable
    async processRequest(req, resp) {
        let {log, workerCtx, handleRequest} = this;

        log.debug`applying request headers to worker context`;
        workerCtx.setHeader('trace', req.headers.trace);

        try {
            await handleRequest(req, resp);
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
    @httpServer
    server

    @worker(RequestHanlder)
    processRequest

    constructor(route) {
        this.server.addRoute(GET, route, this.processRequest);
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

