"use strict";

const VerifyLocksHandler = require('./common/LockHandler');

exports.handler = function(event, context, callback) {
    const handler = new VerifyLocksHandler('verify');
    return handler.handle(event, context, callback);
};
