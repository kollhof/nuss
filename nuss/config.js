import {factory} from './ioc/create';
import {getContexts} from './ioc/context';
import {decorations, dependencyDecorator} from './ioc/decorators';
import {array, last} from './iter';
import {DefaultMap} from './default-maps';


export function getConfigPath(decoration) {
    let {decorator, decoratorDescr} = decoration;
    let conf = decoratorDescr.config || {path: []};

    let {key, path, description, value} = conf;
    if (path === undefined) {
        path = [];
    } else if (path[0] === '/') {
        return [{
            key: key || decorator.name,
            optional: false,
            root: true,
            description
        }];
    } else {
        path = [{key: decorator.name, optional: true}]
            .concat(path);
    }

    if (key !== undefined) {
        path.push({key, description, optional: false, value});
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

function mul(len, char=' ') {
    return (new Array(len + 1)).join(char);
}


function mergePath(path, tree) {
    for (let {key, parents, description, overrides, value} of path) {
        let subTree = tree.get(key);

        if (overrides !== undefined) {
            subTree.overrides.add(overrides);
        }

        if (description !== undefined) {
            subTree.descriptions.add(description);
        }

        if (parents.length) {
            subTree.parents.add(parents.join(':'));
        }

        subTree.value = value;

        tree = subTree.children;
    }
}

function buildTree(confPath, tree) {
    let parents =[];
    let isRoot = false;
    let path = [];

    for (let {key, description, optional, root, value} of confPath) {
        isRoot = isRoot || root;

        if (optional) {
            parents.push(key);
        } else {
            if (isRoot) {
                (last(path) || {}).overrides = key;
                mergePath(path, tree);
                path = [];
                isRoot = false;
            }

            path.push({key, parents, description, value});
            parents = [];
        }
    }

    mergePath(path, tree);
}


function printTree(map, indent=0) {
    for (let [key, item] of map) {
        let {descriptions, parents, children, overrides, value} = item;

        if (descriptions.size > 0) {
            console.log('');
        }
        for (let descr of descriptions) {
            console.log(`${mul(indent)}# ${descr}`);
        }

        if (value === undefined) {
            let nest = '';
            if (parents.size > 0) {
                nest = ` # nestable under: ${array(parents).join(':, ')}:`;
            }
            console.log(`${mul(indent)}${key}: ${nest}`);
        } else {
            console.log(`${mul(indent)}${key}: ${value}`);
        }

        printTree(children, indent + 4);

        if (overrides.size) {
            console.log(`\n${mul(indent + 4)}# may contain: ` +
                        `${array(overrides).join(':,')}:`);
        }

    }
}

function genTree() {
    return {
        descriptions: new Set(),
        parents: new Set(),
        overrides: new Set(),
        children: new DefaultMap(genTree)
    };
}

export function printConfig(cls) {
    let tree = new DefaultMap(genTree);

    for (let path of getConfigPaths(cls)) {
        buildTree(path, tree);
    }

    printTree(tree);
}

export function flattenConfigData(cls, data) {
    let flattenedData = {};

    for (let path of getConfigPaths(cls)) {
        let tree = data;
        let expanded = [];

        for (let item of path) {
            let {key, optional, root} = item;
            expanded.push(key);

            if (root) {
                let nextKey = path
                    .slice(path.indexOf(item))
                    .find((pathItem)=> !pathItem.optional)
                    .key;

                if (tree[nextKey] === undefined) {
                    tree = data;
                }
            }

            if (optional) {
                if (tree[key] !== undefined) {
                    tree = tree[key];
                }
            } else {
                tree = tree[key];
            }
        }
        if (tree === undefined) {
            throw new Error(`missing config for ${expanded}`);
        }
        flattenedData[expanded.join(':')] = tree;
    }

    return flattenedData;
}

function getTargetConfigPath(target) {
    let path = [];
    let classes = new Set();

    for (let {decoration} of getContexts(target)) {

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

    @factory
    get value() {
        let {data} = this;

        let expandedKey = getTargetConfigPath(this)
            .map(({key})=> key)
            .join(':');

        return data[expandedKey];
    }
}

export function config(key, description) {
    return (proto, name, descr)=> {

        if (description === undefined) {
            description = key;
            key = name;
        }
        let configDescr = {key, description};

        let {initializer} = descr;
        if (initializer) {
            configDescr.value = initializer.call(config);
        }

        return dependencyDecorator(config, {
            dependencyClass: ConfigProvider,
            constructorArgs: [],
            config: configDescr
        })(proto, name, descr);
    };
}
