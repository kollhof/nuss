import {describe, it, expect} from './testing';

import {indenter} from 'nuss/strings';


describe('indenter()', ()=> {
    it('should not indent on first level', ()=> {
        let indent = indenter();
        expect(indent`foobar`).to.equal('foobar');
    });

    it('should indent with 4 spaces for next() level', ()=> {
        let indent = indenter().next();
        expect(indent`foobar`).to.equal('    foobar');
    });

    it('should indent with given indentation string', ()=> {
        let indent = indenter('**').next();

        expect(indent`foobar`).to.equal('**foobar');
        expect(indent.next()`foobar`).to.equal('****foobar');
    });
});

