import {DefaultWeakMap} from '../default-maps';
import {create} from './create';
import {getContext} from './context';

const IMPLEMENTATION_PROVIDERS = new DefaultWeakMap(()=> new Map());


export function createDecoratedHandler(decoration, target) {
    let {decoratedClass, decoratedMethod} = decoration;
    let obj = create(decoratedClass, [], {decoration, target});
    return decoratedMethod.bind(obj);
}


export function provide(decorator) {
    return (proto, name, descr)=> {
        IMPLEMENTATION_PROVIDERS.get(proto).set(decorator, descr.value);
    };
}


export function findProvider(decorator, target) {
    let ctx = getContext(target);

    while (ctx !== undefined) {
        let provider = ctx.target;
        let proto = provider.constructor.prototype;

        let func = IMPLEMENTATION_PROVIDERS
            .get(proto)
            .get(decorator);

        if (func !== undefined) {
            return func.bind(provider);
        }
        ctx = getContext(provider);
    }
}


function getImplementationFromProvider(decoration, target) {
    for (let decorator of [decoration.decorator, getImplementation]) {

        let getImpl = findProvider(decorator, target);

        if (getImpl !== undefined) {
            let obj = getImpl(decoration, target);
            if (obj !== undefined) {
                return obj;
            }
        }
    }
}

export function getImplementation(decoration, target) {
    let obj = getImplementationFromProvider(decoration, target);

    if (obj !== undefined) {
        return obj;
    }

    let {dependencyClass, constructorArgs} = decoration.decoratorDescr;

    return create(dependencyClass, constructorArgs, {decoration, target});
}

