"use strict";

const ObjectHandler = require('./common/ObjectHandler');
const ObjectProcessor = require('./common/ObjectProcessor');
const Datastore = require('./common/S3Datastore');

exports.handler = function(event, context, callback) {
    const resource = event.resource;
    const datastore = new Datastore(process.env.GLL_ARTIFACTS_BUCKET);
    const processor = new ObjectProcessor(datastore, process.env.GLL_ENDPOINT, resource);
    const handler = new ObjectHandler('batch', processor);
    return handler.handle(event, context, callback);
};
