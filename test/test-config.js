import {expect} from 'chai';
import {it, describe} from 'mocha';

import {config} from 'nuss/config';


describe('config() decorator', ()=> {

    class Foobar {
        @config('spam')
        spam
    }

    it('should inject configuration', ()=> {
        //let foobar = new Foobar();

        //expect(foobar.spam).to.be.equal(null);
    });
});

