import { EventEmitter } from 'events';
import * as NC from 'node-cache';

export class Client extends EventEmitter {
    private cache = new NC();

    constructor() {
        super();
    }
}