import {expect} from 'chai';
import {it, describe} from 'mocha';

import {DefaultMap, DefaultWeakMap} from 'nuss/default-maps';


describe('DefaultMap', ()=> {
    it('should be a Map', ()=> {
        let map = new DefaultMap();

        expect(map).to.be.an.instanceof(Map);
    });

    it('should return and store a default value', ()=> {
        let map = new DefaultMap(()=> 'foobar');

        expect(map.has('spam')).to.be.false;
        expect(map.get('spam')).to.equal('foobar');
    });

    it('should allow iterable in ctor', ()=> {
        let map = new DefaultMap([['spam', 'foobar']], ()=> 'ni');

        expect(map.has('spam')).to.be.true;
        expect(map.get('spam')).to.equal('foobar');
    });
});


describe('DefaultWeakMap', ()=> {
    it('should be a WeakMap', ()=> {
        let map = new DefaultWeakMap();

        expect(map).to.be.an.instanceof(WeakMap);
    });

    it('should return and store a default value', ()=> {
        let map = new DefaultWeakMap(()=> 'foobar');
        let key = {};

        expect(map.has(key)).to.be.false;
        expect(map.get(key)).to.equal('foobar');
    });

    it('should allow iterable in ctor', ()=> {
        let key = {};
        let map = new DefaultWeakMap([[key, 'foobar']], ()=> 'ni');

        expect(map.has(key)).to.be.true;
        expect(map.get(key)).to.equal('foobar');
    });
});
