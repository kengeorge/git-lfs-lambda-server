"use strict";
const K = require('kpromise');
const startWith = K.startWith;

const Lock = require('./Lock');
const tempLock = new Lock(
    "fake id",
    "/fake/path",
    new Date().toISOString(),
    {name: "Fake Owner"}
);

class Locks {
    list() {
        return startWith(Locks.toListLocksResponse())
    }

    verify() {
        return startWith(Locks.toVerifyLocksResponse())
    }

    create() {
        return startWith(Locks.toLockResponse(tempLock));
    }

    delete() {
        return startWith(Locks.toLockResponse(tempLock));
    }

    static toLockResponse(lock) {
        return {
            lock: lock
        };
    }

    static toVerifyLocksResponse() {
        return {
            "ours": [],
            "theirs": [],
            //"next_cursor": "optional next ID",
        }
    }

    static toListLocksResponse() {
        return {
            "locks": [],
            //"next_cursor": "optional next ID",
        };
    }
}

module.exports = Locks;