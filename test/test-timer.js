import {describe, it, expect, spy} from './testing';
import {getEntrypoints} from 'nuss/testing';
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
        let [tmr] = getEntrypoints(Service);

        await tmr.start();

        await sleep(SLEEP_TIME);
        expect(handleTick)
            .to.have.been
            .calledWithExactly();

        await tmr.stop();
        handleTick.reset();

        await sleep(SLEEP_TIME);
        expect(handleTick)
            .to.have
            .callCount(0);

    });
});
