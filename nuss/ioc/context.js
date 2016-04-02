import {shortid} from '../uuid';

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


export class Context {
    id = shortid();
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

export class InvokerContext extends Context {
    constructor(decoration) {
        super();
        this.decoration = decoration;
    }

    get name() {
        let {decoratedClass, decoratedMethod, decorator} = this.decoration;
        let clsName = decoratedClass.name;
        let handlerName = decoratedMethod.name;
        let decoratorName = decorator.name;

        return `${clsName}.${handlerName}@${decoratorName}`;
    }
}
