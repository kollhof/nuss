import {uuid} from '../uuid';
import {DefaultWeakMap} from '../default-maps';


const CONTEXT_HANDLERS = new DefaultWeakMap(()=> new Map());
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

export function handle(decorator) {
    return (proto, name, descr)=> {
        CONTEXT_HANDLERS.get(proto).set(decorator, descr.value);
    };
}

export function findContextMethod(decorator, target) {
    let ctx = getContext(target) || target;

    while (ctx) {
        // Object.getPrototypeOf(ctx);
        let proto = ctx.constructor.prototype;

        let func = CONTEXT_HANDLERS
            .get(proto)
            .get(decorator);

        if (func !== undefined) {
            return func.bind(ctx);
        }
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

