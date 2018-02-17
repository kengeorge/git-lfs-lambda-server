'use strict';

const toLambdaResponse = require('./common/lambdaResponse').toLambdaResponse;
const K = require('kpromise');
const log = K.log;
const startWith = K.startWith;
const get = K.get;

exports.handler = function(event, context, callback) {
    log("CONTEXT vvvvvvvvvvvvvvvv");
    log(context);
    log("^^^^^^^^^^^^^^^^ CONTEXT");

    let request = JSON.parse(event.body);
    log("REQUEST vvvvvvvvvvvvvvvv");
    log(request);
    log("^^^^^^^^^^^^^^^^ REQUEST");

    return startWith(request)
        .then(get('path'))
        .then(K.print("RESPONSE vvvvvvvvvvvvvvvv"))
        .then(K.peek)
        .then(K.print("^^^^^^^^^^^^^^^^ RESPONSE"))
        .then(toLambdaResponse(200))
        .then((res) => callback(null, res))
};
