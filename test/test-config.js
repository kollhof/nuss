import {describe, it, expect} from './testing';
import {methodDecorator} from 'nuss/ioc/decorators';
import {ltrim} from 'nuss/strings';
import {config} from 'nuss/config';
import {printConfig} from 'nuss/config/generator';
import {loadConfig, flattenConfigData, Script} from 'nuss/config/loader';
import {logger} from 'nuss/logging';
import {worker} from 'nuss/worker';

class Spam {
    @config('Retry count')
    foobar='ham'

    @worker
    process

    handleMessage(msg) {
        return this.process(msg);
    }
}

function spam(proto, name, descr) {
    return methodDecorator(spam, {
        dependencyClass: Spam,
        config: [{
            root: true,
            key: 'spam',
            description: 'config for @spam()'
        }]
    })(proto, name, descr);
}


class Service {
    @logger
    log

    @config()
    shrub='ni'

    @spam
    async sleep(msg) {
        this.log.debug`received ${msg}`;
    }
}

class Writer {
    data=''
    write(data) {
        this.data += data;
    }
}
let formatScript = new Script('`${shortColoredLevel}:${context}: ${message}`');


describe('printConfig()', ()=> {

    it('should inject configuration', async ()=> {
        let out =  new Writer();

        printConfig(Service, out);

        expect(out.data).to.be.equal(ltrim`

            # Logger configuration
            # nestable under worker:
            logger:

                # Log level (error, info, debug)
                level: debug

                # Custom Handler
                handler:

                    # output stream
                    stream: stderr

                    # Custom Formatter
                    formatter:

                        # message format
                        format: !es ${
                            "'`${shortColoredLevel}:${context}: ${message}`'"}

            shrub: ni

            # config for @spam()
            spam:

                # Retry count
                foobar: ham

                # may contain: logger:
        `);
    });
});

describe('loadConfig()', ()=> {
    it('should load config', ()=> {
        let out = new Writer();

        printConfig(Service, out);
        let confData = loadConfig(out.data);

        expect(confData).to.deep.equal({
            logger: {
                handler: {
                    formatter: {
                        format: formatScript
                    },
                    stream: 'stderr'
                },
                level: 'debug'
            },
            shrub: 'ni',
            spam: {
                foobar: 'ham'
            }
        });
    });
});

describe('flattenConfig()', ()=> {
    it('should load config', ()=> {
        let out = new Writer();

        printConfig(Service, out);
        let confData = flattenConfigData(Service, loadConfig(out.data));

        expect(confData).to.deep.equal({
            'logger:handler:formatter:format': formatScript,
            'logger:handler:stream': 'stderr',
            'logger:level': 'debug',
            shrub: 'ni',
            'spam:foobar': 'ham',
            'spam:worker:logger:handler:formatter:format': formatScript,
            'spam:worker:logger:handler:stream': 'stderr',
            'spam:worker:logger:level': 'debug'
        });
    });

    it('should error if config missing', ()=> {
        expect(()=> flattenConfigData(Service, '')).to.throw();
    });
});

