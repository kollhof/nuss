import {describe, it, expect, Writer} from './testing';
import {createTestSubjects} from 'nuss/testing';

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

    getConfigs() {
        return this.process(this.foobar);
    }
}

function spam(proto, name, descr) {
    return methodDecorator(spam, {
        dependencyClass: Spam,
        config: [{
            root: true,
            key: 'spam',
            description: 'config for @spam()'
        }, {
            key: 'eggs',
            optional: true
        }]
    })(proto, name, descr);
}


class Service {
    @logger
    log

    @config()
    shrub

    @spam
    async sleep(foobar) {
        return [foobar, this.shrub];
    }
}


let formatScript = new Script('`${lvl}:${context}: ${message}`');


describe('@config', ()=> {
    it('should apply config value', async ()=> {
        let [spammer] = createTestSubjects(Service, {
            config: {
                shrub: 'nini',
                spam: {
                    foobar: 'ham & eggs'
                }
            }
        })(spam);

        let [foobar, shrub] = await spammer.getConfigs();

        expect(shrub).to.equal('nini');
        expect(foobar).to.equal('ham & eggs');
    });
});

describe('printConfig()', ()=> {

    it('should inject configuration', async ()=> {
        let out = new Writer();

        printConfig(Service, out);

        expect(out.data).to.be.equal(ltrim`

            # Logging configuration
            # nestable under eggs:worker:
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
                            "'`${lvl}:${context}: ${message}`'"}

            shrub:

            # config for @spam()
            spam:

                # Retry count
                # nestable under eggs:
                foobar: ham

                # may contain: logger:
        `);
    });
});

describe('config loader', ()=> {
    let data = ltrim`

        logger:
            level: debug
            handler:
                stream: stderr
                formatter:
                    format: !es ${
                        "'`${lvl}:${context}: ${message}`'"}
        shrub: ni
        spam:
            eggs:
                foobar: ham
    `;


    it('should load config', ()=> {
        let confData = loadConfig(data);

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
                eggs: {
                    foobar: 'ham'
                }
            }
        });
    });

    it('should flatten loaded config', ()=> {
        let confData = flattenConfigData(Service, loadConfig(data));

        expect(confData).to.deep.equal({
            'logger:handler:formatter:format': formatScript,
            'logger:handler:stream': 'stderr',
            'logger:level': 'debug',
            shrub: 'ni',
            'spam:eggs:foobar': 'ham',
            'spam:eggs:worker:logger:handler:formatter:format': formatScript,
            'spam:eggs:worker:logger:handler:stream': 'stderr',
            'spam:eggs:worker:logger:level': 'debug'
        });
    });

    it('should error if config missing', ()=> {
        expect(()=> flattenConfigData(Service, '')).to.throw();
    });
});

