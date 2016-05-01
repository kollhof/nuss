import yaml from 'js-yaml';

import {array, last} from '../iter';
import {DefaultMap} from '../default-maps';
import {indenter} from '../strings';

import {CONFIG_SCHEMA} from './loader';
import {getConfigPaths} from './resolve';


function defaultTree() {
    return {
        descriptions: new Set(),
        parents: new Set(),
        overrides: new Set(),
        children: new DefaultMap(defaultTree)
    };
}

function mergePathItem(pathItem, tree) {
    let {key, parents, description, overrides, value} = pathItem;

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

    return subTree.children;
}

function mergePath(path, tree) {
    for (let item of path) {
        tree = mergePathItem(item, tree);
    }
}

function mergeIfRoot(key, isRoot, path, tree) {
    if (isRoot) {
        (last(path) || {}).overrides = key;

        mergePath(path, tree);

        path = [];
        isRoot = false;
    }

    return [path, isRoot];
}


function addPathToTree(confPath, tree) {
    let parents =[];
    let isRoot = false;
    let path = [];

    for (let {key, description, optional, root, value} of confPath) {
        isRoot = isRoot || root;

        if (optional) {
            parents.push(key);
        } else {
            [path, isRoot] = mergeIfRoot(key, isRoot, path, tree);

            path.push({key, parents, description, value});

            parents = [];
        }
    }

    mergePath(path, tree);
}

function buildTree(cls) {
    let tree = new DefaultMap(defaultTree);

    for (let path of getConfigPaths(cls)) {
        addPathToTree(path, tree);
    }

    return tree;
}


function writeDescriptions(descriptions, out, indent) {
    for (let descr of descriptions) {
        out.write(indent`# ${descr}`);
        out.write('\n');
    }
}


function writeParents(parents, out, indent) {
    if (parents.size > 0) {
        parents = array(parents).join(':, ');
        out.write(indent`# nestable under ${parents}:`);
        out.write('\n');
    }
}

function writeKeyValue(key, value, out, indent) { // eslint-disable-line
    let keyValue = indent`${key}:\n`;

    if (value !== undefined) {
        let lines = yaml
            .safeDump({[key]: value}, {indent: 4, schema: CONFIG_SCHEMA})
            .split('\n');

        // TODO: hack for !<!es>
        keyValue = lines
            .map((str)=> str.replace('!<!es> |-', '!es |'))
            .map((str)=> str.replace('!<!es>', '!es'))
            .map((str)=> str === '' ? '': indent`${str}`)
            .join('\n');
    }

    out.write(`${keyValue}`);
}

function writePotentialChildren(children, out, indent) {
    if (children.size) {
        children = array(children).join(':,');
        out.write('\n');
        out.write(indent.next()`# may contain: ${children}:`);
        out.write('\n');
    }
}

function writeTree(tree, out, indent=indenter()) {
    for (let [key, item] of tree) {
        let {descriptions, parents, children, overrides, value} = item;

        out.write('\n');

        writeDescriptions(descriptions, out, indent);
        writeParents(parents, out, indent);
        writeKeyValue(key, value, out, indent);

        writeTree(children, out, indent.next());

        writePotentialChildren(overrides, out, indent);
    }
}


export function printConfig(cls, out) {
    let tree = buildTree(cls);
    writeTree(tree, out);
}
