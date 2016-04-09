import {DefaultWeakMap} from '../default-maps';
import {getImplementation} from './resolve';

const DECORATED_METHODS = new DefaultWeakMap(()=> []);
const DECORATED_PROPS = new DefaultWeakMap(()=> []);


export function getDecoratedMethods(cls) {
    return DECORATED_METHODS.get(cls.prototype);
}

export function getDecoratedProps(cls) {
    return DECORATED_PROPS.get(cls.prototype);
}

export function* decorations(cls) {
    yield * getDecoratedProps(cls);
    yield * getDecoratedMethods(cls);
}


export function methodDecorator(decorator, decoratorDescr) {
    return (proto, name, descr)=> {
        let decoratedClass = proto.constructor;
        let decoratedMethod = descr.value;

        let decoration = {
            decorator,
            decoratorDescr,
            decoratedClass,
            decoratedMethod,
            decoratedName: name
        };

        DECORATED_METHODS
            .get(proto)
            .push(decoration);

        return descr;
    };
}

export function dependencyDecorator(decorator, decoratorDescr) {
    return (proto, name, descr)=> {
        let decoration = {
            decorator,
            decoratorDescr,
            decoratedClass: proto.constructor,
            decoratedName: name
        };

        DECORATED_PROPS
            .get(proto)
            .push(decoration);

        descr.writable = true;
        descr.initializer = function() {
            return getImplementation(decoration, this);
        };
        return descr;
    };
}

