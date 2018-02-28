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
        return promiseFor(Locks.toListLocksResponse())
    }

    verify() {
        return promiseFor(Locks.toVerifyLocksResponse())
    }

    create(pathToFile) {
        return promiseFor(Locks.toLockResponse(tempLock));
    }

    delete() {
        return promiseFor(Locks.toLockResponse(tempLock));
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