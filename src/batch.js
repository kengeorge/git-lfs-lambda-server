"use strict";

const BatchHandler = require('./BatchHandler');

exports.handler = function(event, context, callback) {
    const handler = new BatchHandler(process.env.GLL_ARTIFACTS_BUCKET);
    return handler.handle(event, context, callback);
};

