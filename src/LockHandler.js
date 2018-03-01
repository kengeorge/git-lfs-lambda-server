const Handler = require('./common/Handler');
const Locks = require('./common/Locks.js')

class VerifyLocksHandler extends Handler {

    constructor(operation) {
        super();
        this.locks = new Locks();
        switch(operation){
            case "verify":
                this.process = this.locks.verify.bind(this);
                break;
            case "list":
                this.process = this.locks.list.bind(this);
                break;
            case "create":
                this.process = this.locks.create.bind(this);
                break;
            case "delete":
                this.process = this.locks.delete.bind(this);
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
