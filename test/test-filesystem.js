import {describe, it, beforeEach, expect, stub} from './testing';

import {FileSystem, fileSystem} from 'nuss/filesystem';
import {getDecoratedProps} from 'nuss/ioc/decorators';
import {isWrapped} from 'nuss/async';


describe('FileSystem', ()=> {
    let fs = null;
    let fileData = 'spam';

    beforeEach(()=> {
        fs = new FileSystem();
        fs.fs = {
            readFileSync: stub().returns(fileData)
        };
    });

    it('should delegate readFileSync()', ()=> {
        let result = fs.readFileSync('path/to/file');

        expect(result).to.equal(fileData);

        expect(fs.fs.readFileSync)
            .to.have.been
            .calledOnce
            .calledWithExactly('path/to/file');
    });

    it('should have async wrapped readFile()', async ()=> {
        expect(isWrapped(fs.readFile)).to.equal(true);
    });
});


describe('@fileSystem()', ()=> {
    class Foobar {
        @fileSystem
        fs
    }

    // TODO: we should not care about the details of decorators
    it('should decorate', ()=> {
        let [descr] = getDecoratedProps(Foobar);

        expect(descr).to.deep.equal({
            decorator: fileSystem,
            decoratorDescr: {
                dependencyClass: FileSystem,
            },
            decoratedClass: Foobar,
            decoratedName: 'fs'
        });
    });
});

