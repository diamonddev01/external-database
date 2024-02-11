import { IQuickDBOptions, QuickDB } from 'quick.db';


const tenMinutes = 10 * 60;

export interface CacheOptions {
    timeToLive?: number;
}

export class Database extends QuickDB {
    constructor(private dbOptions: IQuickDBOptions) {
        super(dbOptions);
    }

    public getTable(tableID: string) {
        const opts = { ...(this.dbOptions) };
        opts.table = tableID;
        const db = new Database(opts);
        return db;
    }
}