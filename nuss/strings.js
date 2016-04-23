
export function indenter(increment='    ', padding='') {
    function indent(parts, ...args) {
        return `${padding}${String.raw({raw: parts}, ...args)}`;
    }

    indent.next = indenter.bind(undefined, increment, padding + increment);
    return indent;
}


// export function ltrim(parts, ...args) {
//     let stripLen = 0;

//     return String.raw({raw: parts}, ...args)
//         .split('\n')
//         .map((lne, idx)=> {
//             if (idx === 1) {
//                 let len = lne.length;
//                 stripLen = len - lne.replace(/^\s+/, '').length;
//             }

//             return lne.slice(stripLen);
//         })
//         .join('\n');
// }
