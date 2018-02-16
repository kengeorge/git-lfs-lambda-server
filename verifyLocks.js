'use strict';

const respond = require('common/lambdaResponse.js');

exports.handler = function(event, context, callback) {
    var response = {
        message:  "Git LFS Lambda api v: -1"
    };
    callback(null, respond(200, response));
};
