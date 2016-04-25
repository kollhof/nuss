import {describe, it, expect, beforeEach, match, spy} from './testing';
import {createTestSubjects} from 'nuss/testing';
import {getDecoratedProps} from 'nuss/ioc/decorators';
import {getContext} from 'nuss/ioc/context';
import {logger, Logger, INFO, ERROR, formatter, handler} from 'nuss/logging';


let testOptions = {
    config: {
        logger: {
            level: 'debug'
        }
    },
    exclude: [handler, formatter]
};


class Service {
    @logger
    log

    debug(msg) {
        this.log.debug`${msg}`;
    }

    info(msg) {
        this.log.info`${msg}`;
    }

    erro(msg) {
        this.log.erro`${msg}`;
    }
}


describe('@logger()', ()=> {
    let subjects = createTestSubjects(Service, testOptions);
    let [service] = subjects(Service);

    it('should log stuff', ()=> {
        service.debug('shurb');
    });
});


// describe('Formatter()', ()=> {

//     let formatScript = {
//         run(ctx) {
//             return `${ctx.shortColoredLevel}:${ctx.context}: ${ctx.message}`;
//         }
//     };

//     let formatter = createTestSubjects(Formatter, {
//         config: {
//             format: formatScript
//         }
//     })(Formatter);

//     it('should format log record', ()=> {
//         let level = ERROR;
//         let target = {};
//         let parts = ['foobar: ', '!'];
//         let args = ['spam'];

//         let msg = formatter.format(level, target, parts, args);

//         expect(msg).to.equal(
//             '\u001b[91;1mE\u001b[0m:\u001b[32;2mObject\u001b[0m: ' +
//             'foobar: \u001b[32m\'spam\'\u001b[39m!'
//         );
//     });
// });


// describe('Handler()', ()=> {

//     let handler = createMocked(Handler, []);
//     handler.stream = {
//         write: spy()
//     };

//     it('should format log record and write it to stream', ()=> {
//         let level = ERROR;
//         let target = {};
//         let parts = ['foobar: ', '!'];
//         let args = ['spam'];
//         handler.format.returns('foobar');

//         handler.handle(level, target, parts, args);

//         expect(handler.format)
//             .to.have.been
//             .calledOnce
//             .calledWithExactly(level, target, parts, args);

//         expect(handler.stream.write)
//             .to.have.been
//             .calledOnce
//             .calledWithExactly('foobar\n');
//     });
// });

// describe('Logger()', ()=> {
//     let log = null;
//     let spam = 'ham';

//     beforeEach(()=> {
//         log = createMocked(Logger, [], {level: 'info'});
//     });

//     it('should not dispatch debug to handler because level to low', ()=> {
//         log.debug`foobar: ${spam}!`;

//         expect(log.handler.handle)
//             .to.have
//             .callCount(0);
//     });

//     it('should dispatch error to handler', ()=> {
//         log.error`foobar: ${spam}!`;

//         expect(log.handler.handle)
//             .to.have.been
//             .calledOnce
//             .calledWithExactly(
//                 ERROR, getContext(log).target,
//                 ['foobar: ', '!'], ['ham']);
//     });

//     it('should dispatch error to handler', ()=> {
//         log.info`foobar: ${spam}!`;

//         expect(log.handler.handle)
//             .to.have.been
//             .calledOnce
//             .calledWithExactly(
//                 INFO, getContext(log).target,
//                 ['foobar: ', '!'], ['ham']);
//     });

//     it('should support timing', ()=> {
//         let tl = log.timeit();

//         tl.info`foobar: ${tl.elapsed}!`;

//         expect(log.handler.handle)
//             .to.have.been
//             .calledOnce
//             .calledWithExactly(
//                 INFO, getContext(log).target,
//                 match(['foobar: ', '!']),
//                 match(([val])=> typeof val === 'number'));
//     });
// });

