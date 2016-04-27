import {Writable} from 'stream';

import {describe, it, expect} from './testing';
import {createTestSubjects, spyCalled} from 'nuss/testing';
import {methodDecorator} from 'nuss/ioc/decorators';
import {ltrim} from 'nuss/strings';
import {config} from 'nuss/config';
import {printConfig} from 'nuss/config/generator';
import {loadConfig, flattenConfigData, Script} from 'nuss/config/loader';
import {logger} from 'nuss/logging';
import {Nuss} from 'nuss/cli';


describe('Nuss()', ()=> {
    let proc = {

    };

    //let subjects =  createTestSubjects(Nuss);
    //let nuss = new Nuss();

    it('should setup signal handlers', async ()=> {


    });
});


