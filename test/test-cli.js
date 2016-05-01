import path from 'path';

import {
    describe, it, beforeEach, expect, spy, stub, match, Writer
} from './testing';
import {createTestSubjects} from 'nuss/testing';
import {printConfig} from 'nuss/config/generator';
import {logger} from 'nuss/logging';
import {Nuss, EXIT_ERROR, EXIT_NO_ERROR} from 'nuss/cli';
import {container} from 'nuss/container';
import {process} from 'nuss/process';
import {fileSystem} from 'nuss/filesystem';


class Service {
    @logger
    logger
}

describe('Nuss()', ()=> {
    let nuss = null;
    let cont = null;
    let fs = null;
    let proc = null;

    beforeEach(()=> {
        let subjects = createTestSubjects(Nuss, {
            config: {},
            includes: [fileSystem, container]
        });

        [nuss] = subjects(Nuss);
        [fs] = subjects(fileSystem);
        [cont] = subjects(container);
        [proc] = subjects(process);

        nuss.args.service = 'spam:Service';
        nuss.require = stub();
        nuss.require.returns({Service});
    });

    it('should setup process event handlers', async ()=> {
        await nuss.main();

        expect(proc.on)
            .to.have.been
            .calledWithExactly('SIGTERM', match.func);

        expect(proc.on)
            .to.have.been
            .calledWithExactly('SIGINT', match.func);

        expect(proc.on)
            .to.have.been
            .calledWithExactly('unhandledRejection', match.func);
    });


    it('should start container with loaded class', async ()=> {
        await nuss.main();

        expect(nuss.require)
            .to.have.been
            .calledOnce
            .calledWithExactly(path.resolve('spam'));

        expect(cont.start)
            .to.have.been
            .calledOnce
            .calledWithExactly(Service);
    });

    it('should stop container on SIGINT', async ()=> {
        await nuss.main();

        await proc.on.withArgs('SIGINT', match.func).callArg(1);

        expect(cont.stop)
            .to.have.been
            .calledOnce
            .calledWithExactly();

        expect(proc.exit)
            .to.have.been
            .calledOnce
            .calledWithExactly(EXIT_NO_ERROR);
    });

    it('should stop container on SIGTERM', async ()=> {
        cont.stop.throws(new Error());

        await nuss.main();

        await proc.on.withArgs('SIGTERM', match.func).callArg(1);

        expect(cont.stop)
            .to.have.been
            .calledOnce
            .calledWithExactly();

        expect(proc.exit)
            .to.have.been
            .calledOnce
            .calledWithExactly(EXIT_ERROR);
    });

    it('should handle unhandled rejections', async ()=> {
        await nuss.main();

        let err = new Error();

        proc.on.withArgs('unhandledRejection', match.func)
            .callArgWith(1, err);

        expect(proc.exit)
            .to.have.been
            .calledOnce
            .calledWithExactly(EXIT_ERROR);
    });

    it('should generate config for loaded class', async ()=> {
        nuss.args.generate_config = true; // eslint-disable-line camelcase
        proc.stdout = new Writer();

        await nuss.main();

        expect(nuss.require)
            .to.have.been
            .calledOnce
            .calledWithExactly(path.resolve('spam'));

        expect(cont.start)
            .to.have.been
            .callCount(0);

        let wrt = new Writer();
        printConfig(Service, wrt);

        expect(proc.stdout.data).to.equal(wrt.data);
    });

    it('should load empty config', ()=> {
        let data = nuss.getConfigData();

        expect(data).to.deep.equal({});
    });

    it('should load and cache config', ()=> {
        nuss.args.config = 'config.yaml';
        let wrt = new Writer();
        printConfig(Service, wrt);
        fs.readFileSync.returns(wrt.data);

        let data = nuss.getConfigData();
        let data2 = nuss.getConfigData();

        expect(data).to.not.deep.equal({});
        expect(data2).to.equal(data);
    });

});


