import {describe, it, expect, spy} from './testing';

import {Timer, timer} from 'nuss/timer';
import {sleep} from 'nuss/async';
import {getDecoratedMethods} from 'nuss/ioc/decorators';


const SLEEP_TIME = 1;

describe('Timer()', ()=> {
    it('should start and call spawnWorker() and stop', async ()=> {
        let tmr = new Timer(0);
        tmr.handleTick = spy();
        tmr.log = {debug: spy()};

        await tmr.start();
        await sleep(SLEEP_TIME);
        expect(tmr.handleTick).to.have.been.called;
        tmr.handleTick.reset();

        await tmr.stop();
        await sleep(SLEEP_TIME);
        expect(tmr.handleTick).to.have.not.been.called;
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
