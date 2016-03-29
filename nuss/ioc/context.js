import {uuid} from '../uuid';

const CONTEXT = Symbol('context');


export function setContext(obj, ctx) {
    obj[CONTEXT] = ctx;
}

export function getContext(obj) {
    return obj[CONTEXT];
}

export function* getContexts(obj) {
    let ctx = getContext(obj);

    while (ctx) {
        yield ctx;
        ctx = getContext(ctx);
    }
}

export function context(proto, name, descr) {
    descr.initializer = function() {
        return getContext(this);
    };
    return descr;
}

export class Context {
    id = uuid();
}

export class InjectionContext extends Context {
    constructor(decoration) {
        super();
        this.decoration = decoration;
    }

    get name() {
        return `@${this.decoration.decorator.name}`;
    }
}

