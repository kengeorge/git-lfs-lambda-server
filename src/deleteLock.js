"use strict";

const Locks = require('./common/Locks');
const locks = new Locks();
const toLambdaResponse = require('./common/responses').lambdaResponse;

exports.handler = function(event, context, callback) {
    let request = JSON.parse(event.body);

    return locks.delete(request)
        .then(toLambdaResponse(200))
        .then((res) => callback(null, res))
};
