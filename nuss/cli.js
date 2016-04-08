#!/usr/bin/env node
'use strict';

import path from 'path';

import {ArgumentParser} from 'argparse';
import yaml from 'js-yaml';

import {logger} from './logging';
import {printConfig, flattenConfigData} from './config';
import {Container} from './container';
import {fileSystem} from './filesystem';
import {create} from './ioc/create';
import {provide} from './ioc/resolve';
import {configData} from './config';

const EXIT_NO_ERROR = 0;
const EXIT_ERROR = 1;


export class Nuss {
    @logger
    log

    @fileSystem
    fs

    constructor(process) {
        this.process = process;
    }

    async main(args) {
        let {log, fs} = this;

        this.registerProcessEvents();

        if (args.require) {
            /* global require: true */
            require(args.require);
        }

        let configFile = path.resolve(args.config);
        let [modFile, clsName] = args.service.split(':');
        modFile = path.resolve(modFile);

        log.debug`loading service module ${modFile}`;
        let mod = require(modFile);
        let cls = mod[clsName];

        if (args.list_config) {
            printConfig(cls);
            return;
        }

        log.debug`loading config ${configFile}`;
        let configSrc = await fs.readFile(configFile);
        let configRaw = yaml.safeLoad(configSrc);

        log.debug`parsing config`;
        this.config = flattenConfigData(cls, configRaw);
        //TODO: use decorator
        let runner = create(Container, [cls], {target: this});
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

        log.error`unhandled async: ${reason}`;
        if (reason.errors) {
            for (let err of reason.errors) {
                log.error`--- ${err}`;
            }
        }

        // TODO: should we call stop?
        process.exit(EXIT_ERROR);
    }

    @provide(configData)
    getConfigData() {
        return this.config;
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
        ['--list-config'], {
            help: 'show config for a service',
            action: 'storeTrue'
        }
    );


    parser.addArgument(
        ['--config'], {
            help: 'importable configuration module (.json file or .js module)',
            required: false
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

