
export const Black = 0;
export const Red = 1;
export const Green = 2;
export const Yellow = 3;
export const Blue = 4;
export const Magenta = 5;
export const Cyan = 6;
export const White = 7;

export const Bold = 1;
export const Faint = 2;
export const Normal = 22;

export const Intense = 60;
export const Standard = 30;


export function colorize(col, mod=Normal) {
    return (parts, ...args)=> {
        let str = String.raw({raw: parts}, ...args);
        return `\x1b[${Standard+col};${mod}m${str}\x1b[0m`;
    };
}

export function intense(clr) {
    return clr + Intense;
}
