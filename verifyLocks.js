"use strict";

const K = require('kpromise');

const Locks = require('common/Locks');
const locks = new Locks();
const toLambdaResponse = require('./common/lambdaResponse').toLambdaResponse;

exports.handler = function(event, context, callback) {
    let request = JSON.parse(event.body);
    return locks.verify(request)
        .then(toLambdaResponse(200))
        .then(K.print("VERIFY LOCKS RESPONSE vvvvvvvvvvvvvvvv"))
        .then(K.peek)
        .then(K.print("^^^^^^^^^^^^^^^^ VERIFY LOCKS RESPONSE"))
        .then((res) => callback(null, res))
};
