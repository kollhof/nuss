
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
