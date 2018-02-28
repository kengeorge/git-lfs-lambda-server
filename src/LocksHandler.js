const Handler = require('./common/Handler');
const Locks = require('./common/Locks.js')

class VerifyLocksHandler extends Handler {

    constructor(operation) {
        super();
        this.locks = new Locks();
        switch(operation){
            case "verify":
                this.process = this.locks.verify;
                break;
            case "list":
                this.process = this.locks.list;
                break;
            case "create":
                this.process = this.locks.create;
                break;
            case "delete":
                this.process = this.locks.delete;
                break;
            default:
                throw new TypeError(`Unsupported lock operation: [${operation}]`);
        }
    }

    getDocUrl(statusCode) {
        return "https://github.com/git-lfs/git-lfs/blob/master/docs/api/locking.md";
    }

}

module.exports = VerifyLocksHandler;
