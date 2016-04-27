import {describe, it, expect, beforeEach, spy} from './testing';
import {createTestSubjects} from 'nuss/testing';
import {logger, formatter, handler, COLOR_MAP} from 'nuss/logging';
import {colorize, Cyan} from 'nuss/colorize';
import {inspect} from 'util';

let format = {
    run(ctx) {
        return `${ctx.shortColoredLevel}:${ctx.context}: ${ctx.message}`;
    }
};

let stream = {
    write: spy()
};

let testOptions = {
    config: {
        logger: {
            level: 'info',
            handler: {
                stream,
                formatter: {
                    format
                }
            }
        }
    },
    exclude: [handler, formatter]
};


class Service {
    @logger
    log
}


describe('@logger()', ()=> {
    let subjects = createTestSubjects(Service, testOptions);
    let [service] = subjects(Service);
    let log = service.log;

    beforeEach(()=> {
        stream.write.reset();
    });

    it('should not log depending on level', ()=> {
        log.debug`shurb ${null}`;
        expect(stream.write)
            .to.have.been
            .callCount(0);
    });

    it('should log objects formatted using inspect()', ()=> {
        log.info`ham ${null} ${undefined}`;

        expect(stream.write)
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

        expect(stream.write)
            .to.have.been
            .calledOnce
            .calledWithExactly(
                `${COLOR_MAP.INFO`I`}:${COLOR_MAP.name`Service`}: ham ${
                    COLOR_MAP.name`Service.log@logger`}\n`
            );
    });

    it('should log decorator in color', ()=> {
        log.info`ham ${logger}`;

        expect(stream.write)
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

        expect(stream.write)
            .to.have.been
            .calledOnce
            .calledWithExactly(
                `${COLOR_MAP.ERROR`E`}:${COLOR_MAP.name`Service`}: ham ${
                    err.stack}\n`
            );
    });
});
