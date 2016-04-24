import {it, describe, beforeEach, afterEach} from 'mocha';
import chai, {expect} from 'chai';
import {spy, mock, stub, match} from 'sinon';
import sinonchai from 'sinon-chai';

chai.use(sinonchai);

export {expect, it, describe, beforeEach, afterEach, spy, mock, stub, match};
