import {describe, it, expect, spy} from './testing';
import {createTestEntrypoints, spyCalled} from 'nuss/testing';
import {timer} from 'nuss/timer';
import {sleep} from 'nuss/async';


const SLEEP_TIME = 1;


describe('@timer()', ()=> {
    let handleTick = spy();

    class Service {

        @timer(0);
        spam() {
            handleTick();
        }
    }

    it('should invoke decorated method and stop', async ()=> {
        let [tmr] = createTestEntrypoints(Service);

        await tmr.start();

        await spyCalled(handleTick);

        expect(handleTick)
            .to.have.been
            .calledOnce
            .calledWithExactly();

        await tmr.stop();
        handleTick.reset();

        await sleep(SLEEP_TIME);
        expect(handleTick)
            .to.have
            .callCount(0);

    });
});
