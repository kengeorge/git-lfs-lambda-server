"use strict";
const K = require('kpromise');
const startWith = K.startWith;

class VerifyLocksProcessor {

    process() {
        var ret = this.toVerifyLocksResponse();
        return startWith(ret);
    }

    toVerifyLocksResponse() {
        return {
            "ours": [],
            "theirs": [],
            //"next_cursor": "optional next ID",
        }
    }

    toLockObject() {
        return {
            "id": "some-uuid",
            "path": "/path/to/file",
            "locked_at": "2016-05-17T15:49:06+00:00",
            "owner": {
                "name": "Jane Doe"
            }
        };
    }
}

module.exports = VerifyLocksProcessor;