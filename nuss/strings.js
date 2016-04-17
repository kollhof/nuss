
export function mul(len, char=' ') {
    return (new Array(len + 1)).join(char);
}


export function indenter(padding='', increment='    ') {
    function indent(parts, ...args) {
        return `${padding}${String.raw({raw: parts}, ...args)}`;
    }

    indent.next = indenter.bind(undefined, padding + increment, increment);
    return indent;
}

