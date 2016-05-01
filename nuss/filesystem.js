import fs from 'fs';

import {dependencyDecorator} from './ioc/decorators';
import {wrap, wraps} from './async';


@wraps('fs')
export class FileSystem {
    fs=fs

    @wrap
    readFile

    readFileSync(...args) {
        return this.fs.readFileSync(...args);
    }

}


export function fileSystem(proto, name, descr) {
    return dependencyDecorator(fileSystem, {
        dependencyClass: FileSystem
    })(proto, name, descr);
}
