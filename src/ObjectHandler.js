const K = require('kpromise');
const startWith = K.startWith;
const forEach = K.forEach;

const Handler = require('./common/Handler');
const TRANSFER_TYPE = "basic";

class ObjectHandler extends Handler {

    constructor(operation, processor) {
        super();

        this.processor = processor;

        switch(operation) {
            case "batch":
                this.process = this.handleBatch.bind(this);
                break;
            case "verify":
                this.process = this.handleVerify.bind(this);
                break;
            default:
                throw new TypeError(`Unsupported lock operation: [${operation}]`);
        }
    }

    handleVerify(request) {
        return startWith(request)
            .then(this.processor.verify)
            .then((v) => {
                switch(v.result) {
                    case "Verified":
                        return request;
                    case "NotFound":
                        throw {statusCode: 404, message: `Object ${request.oid} not found.`};
                    case "WrongSize":
                        throw {
                            statusCode: 411,
                            message: `Expected object of size ${request.size} but found ${v.found.size}`
                        };
                }
                throw new Error(`Unknown verification result ${v.result}`);
            });
    }

    handleBatch(request) {
        if(request.transfers && !request.transfers.includes(TRANSFER_TYPE)) {
            throw {
                statusCode: 422,
                message: `Unsupported transfer type: [${request.transfers}]`
            };
        }

        const processFunction = request.operation === "upload"
            ? this.processor.processUpload
            : this.processor.processDownload;

        return startWith(request.objects)
            .then(forEach(processFunction))
            .then((responses) => {
                return {
                    transfer: TRANSFER_TYPE,
                    objects: responses
                }
            });
    }

    getDocUrl(statusCode) {
        return "https://github.com/git-lfs/git-lfs/blob/master/docs/api/batch.md";
    }

}

module.exports = ObjectHandler;