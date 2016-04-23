import {expect} from 'chai';
import {it, describe} from 'mocha';

import {create, callable, createFromDescr} from 'nuss/ioc/create';


// describe('create()', ()=> {


//     it('should create object', ()=> {
//         class Foobar {
//             constructor(...ctorArgs) {
//                 this.args = ctorArgs;
//             }
//         }

//         let args = ['foobar', 'spam'];
//         let foobar = create(Foobar, args, {});

//         expect(foobar).to.be.instanceof(Foobar);
//         expect(foobar.constructor).to.equal(Foobar);
//         expect(foobar.args).to.deep.equal(args);
//     });

//     it('should create callable object', ()=> {
//         class Foobar {
//             constructor(...ctorArgs) {
//                 this.args = ctorArgs;
//             }

//             @callable
//             shrub(...callArgs) {
//                 return [this, callArgs];
//             }
//         }

//         let args = ['foobar', 'spam'];
//         let shrub = create(Foobar, args, {});
//         let [foobar, result] = shrub(args);

//         expect(shrub).to.be.instanceof(Function);
//         expect(foobar).to.be.instanceof(Foobar);
//         expect(foobar.args).to.deep.equal(args);
//     });
// });

