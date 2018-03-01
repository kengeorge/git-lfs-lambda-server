"use strict";

const VerifyLocksHandler = require('./LockHandler');

exports.handler = function(event, context, callback) {
    require('kpromise').log("env: %s\nevent: %s\ncontext %s", process.env, event, context);

    const handler = new VerifyLocksHandler('list');
    return handler.handle(event, context, callback);
};
