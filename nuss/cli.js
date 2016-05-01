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
import {process} from './process';


export const EXIT_NO_ERROR = 0;
export const EXIT_ERROR = 1;

class NonThrowingParser extends ArgumentParser {
    error() {
        // nop
    }
}
let nussArgs = new NonThrowingParser({
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


nussArgs.addArgument(
    ['--no-babel-register'], {
        help: 'disable the use of babel-register to auto compile services',
        defaultValue: false,
        action: 'storeFalse'
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
    require=require; // eslint-disable-line

    @cmdArgs(nussArgs)
    args

    @fileSystem
    fs

    @logger
    log

    @container
    container

    @process
    process

    async main() {
        let {args, process: {stdout}} = this;

        this.registerProcessEvents();

        let cls = this.getServiceClass();

        if (args.generate_config) {
            printConfig(cls, stdout);
            return;
        }

        await this.container.start(cls);
    }

    registerProcessEvents() {
        let {log, process: proc} = this;

        log.debug`setting up process events`;

        proc.on('unhandledRejection',
            (err)=> this.handleUnhandledRejection(err));
        proc.on('SIGTERM', ()=> this.stop('term'));
        proc.on('SIGINT', ()=> this.stop('int'));
    }

    handleUnhandledRejection(reason) {
        let {log, process: proc} = this;

        log.error`unhandled async: ${reason}`;

        // TODO: should we call stop?
        proc.exit(EXIT_ERROR);
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
        let {args} = this;

        if (!args.no_babel_register) {
            this.require('babel-register');
        }

        let [modFile, clsName] = args.service.split(':');
        modFile = path.resolve(modFile);

        let mod = this.require(modFile);
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
            this.config = config;
        }

        return config;
    }

    async stop(signal) {
        let {log, process: proc} = this;

        try {
            log.debug`cought signal ${signal}, stopping application`;
            await this.container.stop();
            proc.exit(EXIT_NO_ERROR);
        } catch (err) {
            try {
                log`error stopping application: ${err}`;
            } finally {
                proc.exit(EXIT_ERROR);
            }
        }
    }
}


/* istanbul ignore if */
/* global module: true */
if (!module.parent) {
    let app = new Nuss();
    app.main();
}

