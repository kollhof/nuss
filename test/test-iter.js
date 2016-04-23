import {describe, it, expect} from './testing';

import {range, array, last} from 'nuss/iter';

const START = 3;
const STOP = 5;

/* eslint no-magic-numbers: 0 */

describe('range()', ()=> {
    it('should creates iterable', ()=> {
        let numbers = range(STOP);
        expect(numbers[Symbol.iterator]).to.be.instanceOf(Function);
    });

    it(`should generate consecutive integers stopping at ${STOP}`, ()=> {
        let numbers = range(STOP);
        expect(array(numbers))
            .to.deep.equal([0, 1, 2, 3, 4]);
    });

    it(`should generate ints starting with ${START} stopping at ${STOP}`, ()=> {
        let numbers = range(START, STOP);
        expect(array(numbers))
            .to.deep.equal([3, 4]);
    });
});


describe('array()', ()=> {
    it('should turn and iterable into an array', ()=> {
        expect(array('spam'))
            .to.deep.equal(['s', 'p', 'a', 'm']);
    });
});

describe('last()', ()=> {
    it('should return the last item of an iterable', ()=> {
        expect(last('spam')).to.equal('m');
        expect(last(range(5))).to.equal(4);
        expect(last([1, 2, 3])).to.equal(3);
    });
});

