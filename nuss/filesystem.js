import fs from 'fs';

import {dependencyDecorator} from './ioc/decorators';



function wrap(proto, name, descr) {
    descr.value = (...args)=> {
        return new Promise((resolve, reject)=> {
            fs[name](...args, (err, data)=> {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    };
    return descr;
}


export class FileSystem {
    @wrap
    readFile () {

    }

}

export function fileSystem(proto, name, descr) {
    return dependencyDecorator(fileSystem, {
        dependencyClass: FileSystem,
        constructorArgs: []
    })(proto, name, descr);
}