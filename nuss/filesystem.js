import fs from 'fs';

import {dependencyDecorator} from './ioc/decorators';
import {wrap} from './async';


export class FileSystem {
    wrapped=fs

    @wrap
    readFile

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
