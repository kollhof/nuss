
export class DefaultWeakMap extends WeakMap {
    constructor(iterable, defaultFunc=iterable) {
        if (iterable === defaultFunc) {
            super();
        } else {
            super(iterable);
        }

        this.defaultFunc = defaultFunc;
    }

    get(key) {
        let result = super.get(key);

        if (result === undefined) {
            result = this.defaultFunc();
            this.set(key, result);
        }
        return result;
    }
}

export class DefaultMap extends Map {
    constructor(iterable, defaultFunc=iterable) {
        if (iterable === defaultFunc) {
            super();
        } else {
            super(iterable);
        }

        this.defaultFunc = defaultFunc;
    }

    get(key) {
        let result = super.get(key);

        if (result === undefined) {
            result = this.defaultFunc();
            this.set(key, result);
        }
        return result;
    }
}
