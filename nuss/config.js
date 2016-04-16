import vm from 'vm';

import yaml from 'js-yaml';

import {factory} from './ioc/create';
import {getContexts} from './ioc/context';
import {decorations, dependencyDecorator} from './ioc/decorators';
import {array, last} from './iter';
import {DefaultMap} from './default-maps';


export class Script {
    constructor(source) {
        this.source = source;
        this.script = new vm.Script(source);
    }

    run(ctx) {
        return this.script.runInContext(ctx);
    }
}

let ScriptYamlType = new yaml.Type('!es', {
    kind: 'scalar',
    instanceOf: Script,

    construct(data) {
        return new Script(data);
    },

    represent(script) {
        return `${script.source}`;
    }
});

export const CONFIG_SCHEMA = yaml.Schema.create([ScriptYamlType]);


export function getConfigPath(decoration) {
    let {decorator, decoratorDescr} = decoration;
    let conf = decoratorDescr.config || {path: []};

    let {key, path, description, value, optional} = conf;

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
        if (optional === undefined) {
            optional = true;
        }
        path = [{key: decorator.name, optional}]
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

function indenter(indent) {
    let ind = (parts, ...args)=> {
        return `${mul( indent)}${String.raw({raw: parts}, ...args)}`;
    };
    ind.next = indenter.bind(undefined, indent + 4);
    return ind;
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


function printTree(map, out, indent=indenter(0)) {
    for (let [key, item] of map) {
        let {descriptions, parents, children, overrides, value} = item;

        if (descriptions.size > 0) {
            out.write('\n');
        }
        for (let descr of descriptions) {
            out.write(indent`# ${descr}\n`);
        }

        if (value === undefined) {
            let nest = '';
            if (parents.size > 0) {
                nest = `# nestable under: ${array(parents).join(':, ')}:`;
            }
            out.write(indent`${key}: ${nest}\n`);
        } else {
            let lines = yaml
                .safeDump({[key]: value}, {indent: 4, schema: CONFIG_SCHEMA})
                .split('\n');

            //TODO: hack for !<!es>
            lines = lines
                .map((str)=> str.replace('!<!es> |-', '!es |'))
                .map((str)=> str.replace('!<!es>', '!es'))
                .map((str)=> indent`${str}`)
                .join('\n');

            out.write(`${lines}\n`);
        }

        printTree(children, out, indent.next());

        if (overrides.size) {
            out.write('\n');
            out.write(
                indent.next()`# may contain: ${array(overrides).join(':,')}:\n`
            );
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

    printTree(tree, process.stdout);
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

        let val = data[expandedKey];

        //TODO: check if key exists
        //TODO: do we really want to support defaults?

        // if (val === undefined) {
        //     let {decoration} = getContext(this);
        //     val = decoration.decoratorDescr.config.value;
        // }
        return val;
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
            configDescr.value = initializer.call(configDescr);
        }

        return dependencyDecorator(config, {
            dependencyClass: ConfigProvider,
            constructorArgs: [],
            config: configDescr
        })(proto, name, descr);
    };
}
