import {describe, it, expect} from './testing';
import {createMocked} from 'nuss/testing';

import {Timer, timer} from 'nuss/timer';
import {sleep} from 'nuss/async';
import {getDecoratedMethods} from 'nuss/ioc/decorators';


const SLEEP_TIME = 1;

describe('Timer()', ()=> {
    it('should start and call handleTick() and stop', async ()=> {
        let tmr = createMocked(Timer, [0]);

        await tmr.start();
        await sleep(SLEEP_TIME);
        expect(tmr.handleTick)
            .to.have.been
            .calledWithExactly();

        tmr.handleTick.reset();

        await tmr.stop();
        await sleep(SLEEP_TIME);
        expect(tmr.handleTick)
            .to.have
            .callCount(0);
    });
});


describe('@timer()', ()=> {
    class Foobar {

        @timer(0);
        spam() {
            // nothing to do
        }
    }

    it('should decorate', ()=> {
        let [descr] = getDecoratedMethods(Foobar);

        expect(descr).to.deep.equal({
            decorator: timer,
            decoratorDescr: {
                dependencyClass: Timer,
                constructorArgs: [0]
            },
            decoratedClass: Foobar,
            decoratedMethod: Foobar.prototype.spam,
            decoratedName: 'spam'
        });
    });
});
