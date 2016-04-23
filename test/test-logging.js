import {describe, it, expect, beforeEach, match, spy} from './testing';
import {createMocked} from 'nuss/testing';
import {getDecoratedProps} from 'nuss/ioc/decorators';
import {getContext} from 'nuss/ioc/context';
import {logger, Logger, INFO, ERROR, Formatter, Handler} from 'nuss/logging';


describe('Formatter()', ()=> {

    let formatScript = {
        run(ctx) {
            return `${ctx.shortColoredLevel}:${ctx.context}: ${ctx.message}`;
        }
    };

    let formatter = createMocked(Formatter, [], {
        format: formatScript
    });

    it('should format log record', ()=> {
        let level = ERROR;
        let target = {};
        let parts = ['foobar: ', '!'];
        let args = ['spam'];

        let msg = formatter.format(level, target, parts, args);

        expect(msg).to.equal(
            '\u001b[91;1mE\u001b[0m:\u001b[32;2mObject\u001b[0m: ' +
            'foobar: \u001b[32m\'spam\'\u001b[39m!'
        );
    });
});


describe('Handler()', ()=> {

    let handler = createMocked(Handler, []);
    handler.stream = {
        write: spy()
    };

    it('should format log record and write it to stream', ()=> {
        let level = ERROR;
        let target = {};
        let parts = ['foobar: ', '!'];
        let args = ['spam'];
        handler.format.returns('foobar');

        handler.handle(level, target, parts, args);

        expect(handler.format)
            .to.have.been
            .calledOnce
            .calledWithExactly(level, target, parts, args);

        expect(handler.stream.write)
            .to.have.been
            .calledOnce
            .calledWithExactly('foobar\n');
    });
});

describe('Logger()', ()=> {
    let log = null;
    let spam = 'ham';

    beforeEach(()=> {
        log = createMocked(Logger, [], {level: 'info'});
    });

    it('should not dispatch debug to handler because level to low', ()=> {
        log.debug`foobar: ${spam}!`;

        expect(log.handler.handle)
            .to.have
            .callCount(0);
    });

    it('should dispatch error to handler', ()=> {
        log.error`foobar: ${spam}!`;

        expect(log.handler.handle)
            .to.have.been
            .calledOnce
            .calledWithExactly(
                ERROR, getContext(log).target,
                ['foobar: ', '!'], ['ham']);
    });

    it('should dispatch error to handler', ()=> {
        log.info`foobar: ${spam}!`;

        expect(log.handler.handle)
            .to.have.been
            .calledOnce
            .calledWithExactly(
                INFO, getContext(log).target,
                ['foobar: ', '!'], ['ham']);
    });

    it('should support timing', ()=> {
        let tl = log.timeit();

        tl.info`foobar: ${tl.elapsed}!`;

        expect(log.handler.handle)
            .to.have.been
            .calledOnce
            .calledWithMatch(
                match.same(INFO),
                match.same(getContext(log).target),
                match(['foobar: ', '!']),
                match(([val])=> typeof val === 'number'));
    });
});


describe('@logger()', ()=> {
    class Foobar {

        @logger;
        log
    }

    // TODO: we should not really care about the details of decorators
    it('should decorate', ()=> {
        let [descr] = getDecoratedProps(Foobar);

        expect(descr).to.deep.equal({
            decorator: logger,
            decoratorDescr: {
                dependencyClass: Logger,
                config: [{
                    root: true,
                    key: 'logger',
                    description: 'Logger configuration'
                }]
            },
            decoratedClass: Foobar,
            decoratedName: 'log'
        });
    });
});
