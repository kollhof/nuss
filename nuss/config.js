import {findDecoratedMethod} from './ioc/resolve';
import {getContextDescr, getContexts, Context} from './ioc/context';


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

function getProperty(obj, path) {
    let val = obj;

    for (let key of path.split('.')) {
        val = val[key];
        if (val === undefined) {
            break;
        }
    }
    return val;
}


function extractConfig(key, configData, target) {
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
            let getConfig = findDecoratedMethod(config, this);

            return extractConfig(key, getConfig(key, this), this);
        };
        return descr;
    };
}
