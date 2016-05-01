import {getContexts} from '../ioc/context';
import {decorations} from '../ioc/decorators';


export function getConfigPath(decoration) {
    let {config=[]} = decoration.decoratorDescr;
    return config;
}


export function* getConfigPaths(cls, parents=[]) {
    for (let decoration of decorations(cls)) {
        let decPath = parents.concat(getConfigPath(decoration));

        // TODO: should compare against decorator
        if (decoration.decorator.name === 'config') {
            yield decPath;
        } else {
            let {decoratorDescr: {dependencyClass}} = decoration;
            yield * getConfigPaths(dependencyClass, decPath);
        }
    }
}


export function getTargetConfigPath(target) {
    let path = [];
    let classes = new Set();

    for (let {decoration} of getContexts(target)) {
        if (decoration !== undefined) {
            let {decoratedClass} = decoration;

            if (classes.has(decoratedClass)) {
                return path;
            }

            classes.add(decoratedClass);

            path = getConfigPath(decoration).concat(path);
        }
    }
    return path;
}
