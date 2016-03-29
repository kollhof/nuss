import {randomBytes} from 'crypto';
import {v4 as uuid4} from 'node-uuid';


export function uuid() {

    return randomBytes(8)
        .toString('base64')
        .replace('+', '$')
        .replace('/', '&')
        .slice(0, -1);
}
