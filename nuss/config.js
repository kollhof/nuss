import {findDecoratedMethod} from './ioc/resolve';


export function config(key) {
    return (proto, name, descr)=> {
        descr.initializer = function() {
            let getConfig = findDecoratedMethod(config, this);

            return getConfig(key, this);
        };
        return descr;
    };
}
