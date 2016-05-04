import {inspect} from 'util';

import {describe, it, expect, beforeEach, spy} from './testing';
import {createTestSubjects} from 'nuss/testing';
import {logger, formatter, handler, COLOR_MAP} from 'nuss/logging';
import {Script} from 'nuss/config/loader';
import {colorize, Cyan} from 'nuss/colorize';
import {worker, workerContext} from 'nuss/worker';
import {methodDecorator} from 'nuss/ioc/decorators';
import {process} from 'nuss/process';


let format = new Script('`${lvl}:${context}: ${message}`');

let testOptions = {
    config: {
        logger: {
            level: 'info',
            handler: {
                stream: 'stderr',
                formatter: {
                    format
                }
            }
        }
    },
    exclude: [handler, formatter]
};


class Spam {
    @worker
    process
}

function spam(proto, name, descr) {
    return methodDecorator(spam, {
        dependencyClass: Spam
    })(proto, name, descr);
}

class Service {
    @logger
    log

    @workerContext
    ctx

    @spam
    handleSpam(msg) {
        this.log.info`${msg}`;
        return this.ctx.id;
    }
}


describe('@logger()', ()=> {
    let subjects = createTestSubjects(Service, testOptions);
    let [service] = subjects(Service);
    let [spammer] = subjects(spam);
    let stderr = null;
    let log = service.log;

    beforeEach(()=> {
        let [proc] = subjects(process);
        stderr = proc.stderr;
        stderr.write = spy();
    });

    it('should not log depending on level', ()=> {
        log.debug`shurb ${null}`;
        expect(stderr.write)
            .to.have.been
            .callCount(0);
    });

    it('should log objects formatted using inspect()', ()=> {
        log.info`ham ${null} ${undefined}`;

        expect(stderr.write)
            .to.have.been
            .calledOnce
            .calledWithExactly(
                `${COLOR_MAP.INFO`I`}:${COLOR_MAP.name`Service`}: ham ${
                    inspect(null, {colors: true})} ${
                    inspect(undefined, {colors: true})}\n`
            );
    });

    it('should log context in color', ()=> {
        log.info`ham ${log}`;

        expect(stderr.write)
            .to.have.been
            .calledOnce
            .calledWithExactly(
                `${COLOR_MAP.INFO`I`}:${COLOR_MAP.name`Service`}: ham ${
                    COLOR_MAP.name`Service.log@logger`}\n`
            );
    });

    it('should log decorator in color', ()=> {
        log.info`ham ${logger}`;

        expect(stderr.write)
            .to.have.been
            .calledOnce
            .calledWithExactly(
                `${COLOR_MAP.INFO`I`}:${COLOR_MAP.name`Service`}: ham ${
                    colorize(Cyan)`${logger.name}()`}\n`
            );
    });

    it('should log error stack in color', ()=> {
        let err = new Error();

        log.error`ham ${err}`;

        expect(stderr.write)
            .to.have.been
            .calledOnce
            .calledWithExactly(
                `${COLOR_MAP.ERROR`E`}:${COLOR_MAP.name`Service`}: ham ${
                    err.stack}\n`
            );
    });

    it('should log worker', ()=> {

        let id=spammer.process('ham & eggs');

        expect(stderr.write)
            .to.have.been
            .calledOnce
            .calledWithExactly(
                `${COLOR_MAP.INFO`I`}:${
                    COLOR_MAP.name`Service.handleSpam@spam`
                }-${
                    COLOR_MAP.name`Spam.process@worker`
                }${
                    COLOR_MAP.worker`<${id}>`
                }-${
                    COLOR_MAP.name`Service.handleSpam@spam`
                }: ${inspect('ham & eggs', {colors: true})}\n`
            );
    });
});
