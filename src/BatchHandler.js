const K = require('kpromise');
const startWith = K.startWith;
const forEach = K.forEach;

const Handler = require('./common/Handler');
const S3Datastore = require('./common/S3Datastore');
const BatchProcessor = require('./BatchProcessor');
const TRANSFER_TYPE = "basic";

class BatchHandler extends Handler {

    constructor(bucketName) {
       super();

       const datastore = new S3Datastore(bucketName);
       this.processor = new BatchProcessor(datastore);
    }

    process(request) {

        if(request.transfers && !request.transfers.includes(TRANSFER_TYPE)) {
            throw {
                statusCode: 422,
                message: `Unsupported transfer type: [${request.transfers}]`
            };
        }

        const processFunction = request.operation === "upload"
            ? this.processor.getUploadDirective
            : this.processor.getDownloadDirective;

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

module.exports = BatchHandler;