
export function* range(start, stop) {

    if (stop === undefined) {
        stop = start;
        start = 0;
    }

    while (start < stop) {
        yield start;
        start += 1;
    }
}

export function last(items) {
    if (items instanceof Array) {
        return items[items.length -1];
    }

    let item = undefined;
    for (item of items) {
        // nop
    }
    return item;
}


export function array(items) {
    return Array.from(items);
}

