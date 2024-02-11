import { IQuickDBOptions } from "quick.db";
import { Request, Response, response } from 'express';
import { CacheOptions, Database } from "../Database/InternalDatabase";
import * as NC from 'node-cache';

interface Options {
    defaultTable: string; // * default main
    filePath: string; // * NO DEFAULT
    useMultiTable: boolean; // * default false
    cacheTimeToLive: number; // * default 10 * 60
    allowPatchToCreateNewItem: boolean; // * default true
}

// A handler covers the requests to one database
export class Handler {
    private cache: NC;
    private database: Database;

    constructor(private options: Options) {
        const dbOptions: IQuickDBOptions = {
            table: options.defaultTable,
            filePath: options.filePath
        };
        const cacheOptions: CacheOptions = {
            timeToLive: options.cacheTimeToLive
        }
        this.database = new Database(dbOptions);
        this.cache = new NC({
            stdTTL: cacheOptions.timeToLive || 10 * 60
        });
    }

    public async handleRequest(request: Request, res: Response): Promise<void> {
        const requestType = request.method;
        switch (requestType) {
            case "GET": {
                this.handleGETRequest(request, res);
            }
        }
    }

    private async handleGETRequest(request: Request, res: Response): Promise<void> {
        // Path structure /table/id OR /id/
        const path = request.path;
        let itemID: string;
        let tableID: string;
        let usingDefaultTable: boolean;

        if (!this.options.useMultiTable) {
            itemID = path;
            tableID = this.options.defaultTable;
            usingDefaultTable = true;
        } else {
            const split = path.split('/');
            let xTableID = split.shift();
            if (!xTableID) {
                res.sendStatus(400);
                return;
            }
            tableID = xTableID;
            itemID = split.join();
            if (itemID.length <= 0) {
                res.sendStatus(400);
                return;
            }
            usingDefaultTable = tableID == this.options.defaultTable;
        }

        // read the cache
        if (this.cache.has(`${tableID}/${itemID}`)) {
            const data = this.cache.get(`${tableID}/${itemID}`);
            res.send(data).end();
            return;
        }

        // read table information
        let db = this.database;
        if (!usingDefaultTable) db = this.database.getTable(tableID);

        const hasItem = await db.has(itemID);
        if (!hasItem) {
            res.sendStatus(404);
            return;
        }

        const item = await db.get(itemID);
        res.send(item).end();
        this.cache.set(`${tableID}/${itemID}`, item);
    }

    private async handlePATCHRequest(request: Request, res: Response): Promise<void> {
        // Path structure /table/id/ or /id/
        const path = request.path;
        let itemID: string;
        let tableID: string;
        let usingDefaultTable: boolean;

        if (!this.options.useMultiTable) {
            itemID = path;
            tableID = this.options.defaultTable;
            usingDefaultTable = true;
        } else {
            const split = path.split('/');
            let xTableID = split.shift();
            if (!xTableID) {
                res.sendStatus(400);
                return;
            }
            tableID = xTableID;
            itemID = split.join();
            if (itemID.length < 0) {
                res.sendStatus(400);
                return;
            }
            usingDefaultTable = tableID == this.options.defaultTable;
        }

        // TODO Make the write request.

        // Read the body of the request
        const body = request.body;
        // TODO add validation for request body & type checking

        // Read table information
        let db = this.database;
        if (!usingDefaultTable) db = this.database.getTable(tableID);

        // TODO Check if the DB has the element already

        // Set the data & update cache, then respond with the data again
        // TODO handle any errors that QDB sends from the set function.
        const db_response = await db.set(itemID, body).catch();
        this.cache.set(`${tableID}/${itemID}`, db_response);
        res.send(db_response).end();
    }
}