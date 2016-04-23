#!/usr/bin/env node
'use strict';

import path from 'path';

import {ArgumentParser} from 'argparse';

import {logger} from './logging';
import {printConfig} from './config/generator';
import {flattenConfigData, loadConfig} from './config/loader';
import {configData} from './config';
import {container} from './container';
import {fileSystem} from './filesystem';
import {factory} from './ioc/create';
import {provide} from './ioc/resolve';
import {dependencyDecorator} from './ioc/decorators';


const EXIT_NO_ERROR = 0;
const EXIT_ERROR = 1;

let nussArgs = new ArgumentParser({
    version: '0.0.1',
    addHelp: true,
    description: 'foo container'
});

nussArgs.addArgument(
    ['--generate-config'], {
        help: 'Generate a config file for a service',
        action: 'storeTrue'
    }
);

nussArgs.addArgument(
    ['--config'], {
        help: 'importable configuration module (.json file or .js module)',
        required: false
    }
);

nussArgs.addArgument(
    ['--service'], {
        help: 'importable module and class e.g. example/service:Foobar',
        required: true
    }
);


class ArgParser {
    constructor(parser) {
        this.parser = parser;
    }

    @factory
    parseArgs() {
        return this.parser.parseArgs();
    }
}

export function cmdArgs(parser) {
    return dependencyDecorator(cmdArgs, {
        dependencyClass: ArgParser,
        constructorArgs: [parser]
    });
}


export class Nuss {
    @cmdArgs(nussArgs)
    args

    @fileSystem
    fs

    @logger
    log

    @container
    container

    constructor(process) {
        this.process = process;
    }

    async main() {
        let {args} = this;

        this.registerProcessEvents();

        let cls = this.getServiceClass();

        if (args.generate_config) {
            printConfig(cls, process.stdout);
            return;
        }

        await this.container.start(cls);
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

    loadConfigData() {
        let configFile = this.args.config;
        if (configFile === null) {
            return;
        }

        configFile = path.resolve(configFile);
        let configSrc = this.fs.readFileSync(configFile);
        return loadConfig(configSrc);
    }

    getServiceClass() {
        let [modFile, clsName] = this.args.service.split(':');
        modFile = path.resolve(modFile);

        /* global require: true */
        let mod = require(modFile);
        return mod[clsName];
    }

    @provide(configData)
    getConfigData() {
        let {config} = this;

        if (config !== undefined) {
            return config;
        }
        let data = this.loadConfigData();

        if (data === undefined) {
            config = {};
        } else {
            let cls = this.getServiceClass();
            config = flattenConfigData(cls, data);
        }

        this.config = config;
        return config;
    }

    async stop(signal) {
        let {log, process} = this;

        try {
            log.debug`cought signal ${signal}, stopping application`;
            await this.container.stop();
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
    /* global process: true */
    let app = new Nuss(process);
    app.main();
}

/* global module: true */
if (!module.parent) {
    main();
}

