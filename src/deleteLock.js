"use strict";

const VerifyLocksHandler = require('./LocksHandler');

exports.handler = function(event, context, callback) {
    const handler = new VerifyLocksHandler('delete');
    return handler.handle(event, context, callback);
};
