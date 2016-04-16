import fs from 'fs';

import {dependencyDecorator} from './ioc/decorators';



function wrap(proto, name, descr) {
    descr.value = function(...args) {
        return new Promise((resolve, reject)=> {
            this.wrapped[name](...args, (err, result)=> {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    };
    return descr;
}


export class FileSystem {
    wrapped=fs

    @wrap
    readFile() { }

    readFileSync(...args) {
        return this.wrapped.readFileSync(...args);
    }

}

export function fileSystem(proto, name, descr) {
    return dependencyDecorator(fileSystem, {
        dependencyClass: FileSystem,
        constructorArgs: []
    })(proto, name, descr);
}
