import {value} from './ioc/create';
import {getContexts} from './ioc/context';
import {decorations, dependencyDecorator} from './ioc/decorators';
import {Logger} from './logging';

let log = new Logger('spam');


export function getConfigPath(decoration) {
    let {decorator, decoratorDescr} = decoration;
    let conf = decoratorDescr.config;

    if (conf === undefined) {
        return [`${decorator.name}`];
    }

    let {key, path} = conf;

    if (path === undefined) {
        path = [];
    } else {
        path = [`${decorator.name}`].concat(path);
    }

    if (key !== undefined) {
        path.push(`${key}`);
    }
    return path;
}

function* getConfigPaths(cls, parents=[]) {
    for (let decoration of decorations(cls)) {
        let decPath = parents.concat(getConfigPath(decoration));


        if (decoration.decorator === config) {
            yield decPath;
        } else {
            let {decoratorDescr} = decoration;
            if (decoratorDescr !== undefined) {
                let {dependencyClass} = decoratorDescr;
                yield * getConfigPaths(dependencyClass, decPath);
            }
        }

    }
}

export function foobar(cls) {
    for (let configPath of getConfigPaths(cls)) {
        log.debug`${configPath}`;
    }
}


function getPath(target) {
    let path = [];

    let classes = new Set();

    for (let ctx of getContexts(target)) {
        let {decoration} = ctx;
        if (decoration !== undefined) {
            let {decoratedClass} = decoration;
            if (classes.has(decoratedClass)) {
                return path;
            }
            classes.add(decoratedClass);
            path.unshift(...getConfigPath(decoration));
        }
    }
    return path;
}


export function configData(proto, name, descr) {
    return dependencyDecorator(configData, {
        dependencyClass: Object,
        constructorArgs: []
    })(proto, name, descr);
}


class ConfigProvider {
    @configData
    data

    @value
    get value() {
        let {data} = this;

        let path = getPath(this);
        let key = path.pop();
        let result = data[key];

        for (let confKey of path) {

            data = data[confKey];
            if (data === undefined) {
                break;
            }

            let val = data[key];
            if (val !== undefined) {
                result = val;
            }
        }

        return result;
    }
}

export function config(key, descr) {
    let path = [];
    if (key !== undefined) {
        path.push(key);
    }

    return dependencyDecorator(config, {
        dependencyClass: ConfigProvider,
        constructorArgs: [],
        config: {
            key,
            description: descr
        }
    });
}
