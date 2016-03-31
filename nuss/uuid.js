import {randomBytes} from 'crypto';
import uuid from 'node-uuid';


export const DEFAULT_SHORTID_WIDTH=8;


export function shortid(width=DEFAULT_SHORTID_WIDTH) {

    return randomBytes(width)
        .toString('base64')
        .replace(/\+/g, '$')
        .replace(/\//g, '&')
        .replace(/=/g, '');
}

export function uuid4() {
    return uuid.v4();
}
