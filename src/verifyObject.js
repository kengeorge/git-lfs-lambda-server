"use strict";

const ObjectHandler = require('./common/ObjectHandler');
const ObjectProcessor = require('./common/ObjectProcessor');
const Datastore = require('./common/S3Datastore');

exports.handler = function(event, context, callback) {
    const stage = event.requestContext.stage;
    const resource = event.resource;

    const datastore = new Datastore(process.env.GLL_ARTIFACTS_BUCKET);
    const processor = new ObjectProcessor(datastore, process.env.GLL_ENDPOINT, resource, stage);
    const handler = new ObjectHandler('verify', processor);

    return handler.handle(event, context, callback);
};
