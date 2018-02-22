"use strict";

const respondWith = require('./common/responses');
const Locks = require('./common/Locks');
const locks = new Locks();

exports.handler = function(event, context, callback) {
    return locks.list()
        .then(respondWith.lambdaResponse(200))
        .then((res) => callback(null, res));
};
