"use strict";

const toLambdaResponse = require('./common/responses').lambdaReponse;
const Locks = require('./common/Locks');
const locks = new Locks();

exports.handler = function(event, context, callback) {
    return locks.list()
        .then(toLambdaResponse(200))
        .then((res) => callback(null, res));
};
