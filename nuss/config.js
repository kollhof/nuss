import {findContextMethod} from './ioc/resolve';


export function config(key) {
    return (proto, name, descr)=> {
        descr.initializer = function() {
            let getConfig = findContextMethod(config, this);

            return getConfig(key, this);
        };
        return descr;
    };
}
