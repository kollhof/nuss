
export function indenter(increment='    ', padding='') {
    function indent(parts, ...args) {
        return `${padding}${String.raw({raw: parts}, ...args)}`;
    }

    indent.next = indenter.bind(undefined, increment, padding + increment);
    return indent;
}
