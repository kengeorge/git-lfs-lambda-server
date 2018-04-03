"use strict";

const ObjectHandler = require('./common/ObjectHandler');
const Datastore = require('./common/S3Datastore');

exports.handler = function(event, context, callback) {
    const resource = event.resource;
    const datastore = new Datastore(process.env.GLL_ARTIFACTS_BUCKET);
    const op = JSON.parse(event.body).operation;
    const handler = new ObjectHandler(op, datastore, process.env.GLL_ENDPOINT, resource);
    return handler.handle(event, context, callback);
};
