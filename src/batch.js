"use strict";

const TRANSFER_TYPE = "basic";
const respondWith = require('./common/responses');

const S3Datastore = require('./common/S3Datastore');
const datastore = new S3Datastore(process.env.GLL_ARTIFACTS_BUCKET);
const BatchProcessor = require('./BatchProcessor');
const processor = new BatchProcessor(datastore);
const K = require('kpromise');
const forEach = K.forEach;
const startWith = K.startWith;

exports.handler = function(event, context, callback) {

    let request = JSON.parse(event.body);

    if(request.transfer && !request.transfer.includes(TRANSFER_TYPE)) {
        return startWith(respondWith.gitLfsError(
            `Unsupported transfer type: [${request.transfer}]`,
            "https://github.com/git-lfs/git-lfs/blob/master/docs/api/batch.md", //TODO
            context.awsRequestId
        ))
            .then(respondWith.lambdaResponse(422))
            .then((res) => callback(res, null));
    }

    const process = request.operation === "upload"
        ? processor.getUploadDirective
        : processor.getDownloadDirective;

    return startWith(request.objects)
        .then(forEach(process))
        .then(toBatchResponseFormat)
        .then(respondWith.lambdaResponse(200))
        .then((response) => callback(null, response))
        .catch((err) => {
            return startWith(respondWith.gitLfsError(err.message, "TODO:doc url", "TODO: request id"))
                .then((response) => callback(response, null));
        })
        ;
};

function toBatchResponseFormat(objectResponses) {
    return {
        transfer: TRANSFER_TYPE,
        objects: objectResponses
    };
}
