import {factory} from '../ioc/create';
import {getContext} from '../ioc/context';
import {dependencyDecorator} from '../ioc/decorators';

import {getTargetConfigPath} from './resolve';


export function configData(proto, name, descr) {
    return dependencyDecorator(configData, {
        dependencyClass: Object
    })(proto, name, descr);
}


class Config {
    @configData
    data

    @factory
    getValue() {
        let {data} = this;

        let expandedKey = getTargetConfigPath(this)
            .map(({key})=> key)
            .join(':');

        let val = data[expandedKey];

        // TODO: check if key exists
        // TODO: do we really want to support defaults?
        if (val === undefined) {
            let {decoration} = getContext(this);
            val = decoration.decoratorDescr.config.value;
        }
        return val;
    }
}

export function config(key, description) {
    return (proto, name, descr)=> {

        if (description === undefined) {
            description = key;
            key = name;
        }

        let {initializer} = descr;
        let value = undefined; // eslint-disable-line no-undef-init

        if (initializer) {
            value = initializer();
        }

        return dependencyDecorator(config, {
            dependencyClass: Config,
            config: [{key, optional: false, description, value}]
        })(proto, name, descr);
    };
}
