import {DefaultWeakMap} from '../default-maps';
import {getImplementation} from './resolve';

const DECORATED_METHODS = new DefaultWeakMap(()=> []);
const DECORATED_PROPS = new DefaultWeakMap(()=> []);
const SHARED = new DefaultWeakMap(()=> new Map());


function getShared(decorator, sharingKey) {
    if (sharingKey !== undefined) {
        return SHARED.get(decorator).get(sharingKey);
    }
}

function setShared(decorator, sharingKey, obj) {
    if (sharingKey !== undefined) {
        SHARED.get(decorator).set(sharingKey, obj);
    }
}


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
        let decoratedClass = proto.constructor;
        let decoration = {
            decorator,
            decoratorDescr,
            decoratedClass,
            decoratedName: name
        };

        DECORATED_PROPS
            .get(proto)
            .push(decoration);

        descr.writable = true;
        descr.initializer = function() {
            let sharingKey = decoratorDescr.sharingKey;

            sharingKey = sharingKey ? sharingKey() : undefined;

            let obj = getShared(decorator, sharingKey);

            if (obj === undefined) {
                obj = getImplementation(decoration, this);
            }

            setShared(decorator, sharingKey, obj);
            return obj;
        };
        return descr;
    };
}

