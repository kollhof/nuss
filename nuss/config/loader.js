import vm from 'vm';

import yaml from 'js-yaml';

import {getConfigPaths} from './resolve';


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


export const CONFIG_SCHEMA = yaml.Schema.create([
    ScriptYamlType
]);


export function loadConfig(src) {
    return yaml.safeLoad(src, {schema: CONFIG_SCHEMA});
}


function getSubTreeForRoot(item, path, tree, data) { /* eslint max-params: 0 */
    if (item.root) {
        let nextKey = path
            .slice(path.indexOf(item))
            .find((pathItem)=> !pathItem.optional)
            .key;

        if (tree === undefined || tree[nextKey] === undefined) {
            tree = data;
        }
    }
    return tree;
}

function getSubTreeOrValue(item, tree) {
    let {key, optional} = item;

    if (optional) {
        if (tree[key] !== undefined) {
            tree = tree[key];
        }
    } else if (tree !== undefined) {
        tree = tree[key];
    }

    return tree;
}

function mergePath(path, data, flattenedData, strict) {
    let treeOrValue = data;
    let expanded = [];

    for (let item of path) {
        expanded.push(item.key);

        treeOrValue = getSubTreeForRoot(item, path, treeOrValue, data);

        treeOrValue = getSubTreeOrValue(item, treeOrValue);
    }

    if (strict && treeOrValue === undefined) {
        throw new Error(`missing config for ${expanded}`);
    }

    flattenedData[expanded.join(':')] = treeOrValue;
}

export function flattenConfigData(cls, data, strict=true) {
    let flattenedData = {};

    for (let path of getConfigPaths(cls)) {
        mergePath(path, data, flattenedData, strict);
    }

    return flattenedData;
}
