
export function indenter(increment='    ', padding='') {
    function indent(parts, ...args) {
        return `${padding}${String.raw({raw: parts}, ...args)}`;
    }

    indent.next = indenter.bind(undefined, increment, padding + increment);
    return indent;
}


export function ltrim(parts, ...args) {
    let stripLen = 0;
    let str = String.raw({raw: parts}, ...args)
        .split('\n');


    str = str.map((lne, idx)=> {
        if (stripLen === 0 && idx > 1 && lne.length > 0) {
            let len = lne.length;
            stripLen = len - lne.replace(/^\s+/, '').length;
        }

        return lne.slice(stripLen);
    });
    str.shift();

    return str.join('\n');
}
