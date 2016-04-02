#!/usr/bin/env node
'use strict';

import {ArgumentParser} from 'argparse';
import {logger} from './logging';
import {Container} from './container';
import path from 'path';

const EXIT_NO_ERROR = 0;
const EXIT_ERROR = 1;


export class Nuss {
    @logger
    log

    constructor(process) {
        this.process = process;
    }

    async main(args) {
        this.registerProcessEvents();

        if (args.require) {
            /* global require: true */
            require(args.require);
        }

        let [modFile, clsName] = args.service.split(':');
        let mod = require(path.resolve(modFile));
        let cls = mod[clsName];
        let config = require(path.resolve(args.config)).default;

        let runner = new Container(cls, config);
        this.runner = runner;
        await runner.start();
    }

    registerProcessEvents() {
        let {log, process} = this;

        log.debug`setting up process events`;

        process.on('unhandledRejection',
            (err)=> this.handleUnhandledRejection(err));
        process.on('SIGTERM', ()=> this.stop('term'));
        process.on('SIGINT', ()=> this.stop('int'));
    }

    handleUnhandledRejection(reason) {
        let {log, process} = this;

        log.error`unhandled async: ${reason.stack}`;
        if (reason.errors) {
            for (let err of reason.errors) {
                log.error`${err.stack}`;
            }
        }

        // TODO: should we call stop?
        process.exit(EXIT_ERROR);
    }


    async stop(signal) {
        let {log, runner, process} = this;

        try {
            log.debug`cought signal ${signal}, stopping application`;
            await runner.stop();
            process.exit(EXIT_NO_ERROR);
        } catch (err) {
            try {
                log`error stopping application: ${err}`;
            } finally {
                process.exit(EXIT_ERROR);
            }
        }
    }

}


export function main() {
    let parser = new ArgumentParser({
        version: '0.0.1',
        addHelp: true,
        description: 'foo runner'
    });

    parser.addArgument(
        ['--config'], {
            help: 'importable configuration module (.json file or .js module)',
            required: true
        }
    );

    parser.addArgument(
        ['--service'], {
            help: 'importable module and class e.g. example/service:Foobar',
            required: true
        }
    );

    parser.addArgument(
        ['--require'], {
            help: 'Extra require e.g. babel-register'
        }
    );

    let args = parser.parseArgs();

    /* global process: true */
    let app = new Nuss(process);
    app.main(args);
}

/* global module: true */
if (!module.parent) {
    main();
}

