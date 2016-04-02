import {findProvider} from './ioc/resolve';
import {getContextDescr, getContexts} from './ioc/context';


function* getPaths(target) {
    let contexts = Array.from(getContexts(target));
    contexts.reverse();

    for (let ctx of contexts) {
        let {dec} = getContextDescr(ctx);
        if (dec !== undefined) {
            yield dec;
        }
    }
}

export function getConfig(key, configData, target) {
    let conf = configData;
    let result = conf[key];

    for (let path of getPaths(target, key)) {

        conf = conf[path];

        if (conf === undefined) {
            break;
        }

        let val = conf[key];
        if (val !== undefined) {
            result = val;
        }
    }

    return result;
}

export function config(key) {
    return (proto, name, descr)=> {
        descr.initializer = function() {
            let getConfigData = findProvider(config, this);
            let data = {};

            if (getConfigData !== undefined) {
                data = getConfigData();
            }
            return getConfig(key, data, this);
        };
        return descr;
    };
}
