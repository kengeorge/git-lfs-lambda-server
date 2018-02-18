"use strict";

const K = require('kpromise');
const log = K.log;

const VerifyLocksProcessor = require('VerifyLocksProcessor');
const processor = new VerifyLocksProcessor();
const toLambdaResponse = require('./common/lambdaResponse').toLambdaResponse;

exports.handler = function(event, context, callback) {
    log("CONTEXT vvvvvvvvvvvvvvvv");
    log(context);
    log("^^^^^^^^^^^^^^^^ CONTEXT");

    let request = JSON.parse(event.body);
    log("REQUEST vvvvvvvvvvvvvvvv");
    log(request);
    log("^^^^^^^^^^^^^^^^ REQUEST");

    return processor.process(request)
        .then(toLambdaResponse(200))
        .then(K.print("RESPONSE vvvvvvvvvvvvvvvv"))
        .then(K.peek)
        .then(K.print("^^^^^^^^^^^^^^^^ RESPONSE"))
        .then((res) => callback(null, res))
};
