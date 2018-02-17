"use strict";

const toLambdaResponse = require('./common/lambdaResponse').toLambdaResponse;
const K = require('kpromise');
const log = K.log;
const startWith = K.startWith;
const get = K.get;

function createLockResponse(){
    return {
        locks: [
            {
                id: "some uuid",
                path: "/newrepo/file/path",
                locked_at: "2016-05-17T15:49:06+00:00",
                owner: {
                    name: "Ken George"
                }
            }
        ]
        ,
        next_cursor: "opt NEXT id"
    };
}

exports.handler = function(event, context, callback) {
    let request = JSON.parse(event.body);

    log("CONTEXT vvvvvvvvvvvvvvvv");
    log(JSON.parse(context));
    log("^^^^^^^^^^^^^^^^ CONTEXT");


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
