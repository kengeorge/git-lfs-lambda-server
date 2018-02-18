"use strict";

const TRANSFER_TYPE = "basic";
const toLambdaResponse = require('./common/lambdaResponse').toLambdaResponse;
const makeProxyResponse = require('./common/lambdaResponse').makeProxyResponse;

const S3Datastore = require('./common/S3Datastore.js');
const datastore = new S3Datastore(process.env.GLL_ARTIFACTS_BUCKET);
const BatchProcessor = require('BatchProcessor.js');
const processor = new BatchProcessor(datastore, TRANSFER_TYPE);

exports.handler = function(event, context, callback) {

    let request = JSON.parse(event.body);

    if(request.transfer && !request.transfer.includes(TRANSFER_TYPE)) {
        let res = makeProxyResponse(422, {"Error": "Unsupported transfer type"});
        return callback(res, null);
    }

    let isUpload = request.operation === "upload";
    return processor.process(request.objects, isUpload)
        .then(toLambdaResponse(200))
        .then((res) => callback(null, res))
    ;
};

