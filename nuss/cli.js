#!/usr/bin/env node
'use strict';

import {ArgumentParser} from 'argparse';

import {Container} from './container';
import path from 'path';

const EXIT_NO_ERROR = 0;
const EXIT_ERROR = 1;

async function stop(runner, proc, signal) {
    try {
        console.log('signal', signal);
        await runner.stop();
        proc.exit(EXIT_NO_ERROR);
    } catch (err) {
        try {
            console.log(err);
        } finally {
            proc.exit(EXIT_ERROR);
        }
    }
}

export async function runService(cls, config, proc=process) {
    let runner = new Container(cls, config);


    proc.on('unhandledRejection', (reason)=> {
        console.log(`Unhandled async: ${reason.stack}`);
        if (reason.errors) {
            for (let err of reason.errors) {
                console.log(err.stack);
            }
        }
        proc.exit(EXIT_ERROR);
    });

    proc.on('SIGTERM', ()=> stop(runner, proc, 'term'));
    proc.on('SIGINT', ()=> stop(runner, proc, 'int'));

    await runner.start();
}


export function main() {
    let parser = new ArgumentParser({
        version: '0.0.1',
        addHelp: true,
        description: 'foo runner'
    });

    parser.addArgument(
        ['--config'], {
            help: 'configuration file'
        }
    );

    parser.addArgument(
        ['--service'], {
            help: 'foo bar'
        }
    );

    parser.addArgument(
        ['-r', '--require'], {
            help: 'foo bar'
        }
    );

    let args = parser.parseArgs();

    if (args.require) {
        require(args.require);
    }

    let [modFile, clsName] = args.service.split(':');
    let mod = require(path.resolve(modFile));
    let cls = mod[clsName];
    let config = require(path.resolve(args.config)).default;

    runService(cls, config);
}

if (! module.parent) {
    main();
}
