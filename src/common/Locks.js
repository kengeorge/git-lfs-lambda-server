"use strict";
const K = require('kpromise');
const promiseFor = K.startWith;

const Lock = require('./Lock');
const tempLock = new Lock(
    "fake id",
    "/fake/path",
    new Date().toISOString(),
    {name: "Fake Owner"}
);

class Locks {
    list() {
        throw {statusCode: 501, message: "Locks: List not implemented"};
    }

    verify() {
        return promiseFor(Locks.toVerifyLocksResponse())
    }

    create(pathToFile) {
        throw {statusCode: 501, message: "Locks: Create not implemented"};
    }

    delete() {
        throw {statusCode: 501, message: "Locks: Delete not implemented"};
    }

    static toLockResponse(lock) {
        return {
            lock: lock
        };
    }

    static toVerifyLocksResponse() {
        return {
            ours: [],
            theirs: [],
            //next_cursor: "optional next ID",
        }
    }

    static toListLocksResponse() {
        return {
            locks: [],
            //next_cursor: "optional next ID",
        };
    }
}

module.exports = Locks;