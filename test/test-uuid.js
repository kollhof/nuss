import {expect} from 'chai';
import {it, describe} from 'mocha';

import {shortid, uuid4} from 'nuss/uuid';
import {range} from 'nuss/iter';


const MAX_NUM_RANDOM_BYTES = 32;
const OUTPUT_LEN_FOR_DEFAULT_INPUT = 11;
const GUID_OUTPUT_LEN = 36;


describe('shortid()', ()=> {
    it('should default to 8 random bytes', ()=> {
        let id = shortid();
        expect(id.length).to.equal(OUTPUT_LEN_FOR_DEFAULT_INPUT);
    });

    it('should generate a short random id', ()=> {
        for (let width of range(MAX_NUM_RANDOM_BYTES)) {
            let id = shortid(width);

            expect(id).to.not.contain('=');
            expect(id).to.not.contain('/');
            expect(id).to.not.contain('+');
        }
    });
});

describe('uuid4()', ()=> {
    it('should return guid', ()=> {
        let id = uuid4();
        expect(id.length).to.equal(GUID_OUTPUT_LEN);
        expect(id).to.match(/\w{8}-\w{4}-4\w{3}-\w{4}-\w{12}/);
    });
});
