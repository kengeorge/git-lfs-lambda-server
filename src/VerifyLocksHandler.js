const startWith = require('kpromise').startWith;
const Handler = require('./common/Handler');
const Locks = require('./common/Locks.js')

class VerifyLocksHandler extends Handler {

    constructor() {
        super();
        this.locks = new Locks();
        this.process = this.process.bind(this);
    }

    process(request) {
        return startWith(request)
            .then(this.locks.verify);
    }

    getDocUrl(statusCode) {
        return "https://github.com/git-lfs/git-lfs/blob/master/docs/api/locking.md";
    }

}

module.exports = VerifyLocksHandler;
