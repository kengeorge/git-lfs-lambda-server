"use strict";

const VerifyLocksHandler = require('./LockHandler');

exports.handler = function(event, context, callback) {
    const handler = new VerifyLocksHandler('delete');
    return handler.handle(event, context, callback);
};
