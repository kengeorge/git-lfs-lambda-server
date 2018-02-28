"use strict";


const VerifyLocksHandler = require('./VerifyLocksHandler');
const handler = new VerifyLocksHandler();

exports.handler = function(event, context, callback) {
    return handler.handle(event, context, callback);
};
