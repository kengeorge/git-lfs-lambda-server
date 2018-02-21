'use strict';

///Conform the given code and body to the Lambda Proxy Response format.
function lambdaProxyResponse(code, bodyObj) {
    return {
        statusCode: code,
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify(bodyObj)
    };
};

///Promise chainable method for a given statusCode
function lambdaResponse(statusCode) {
    return function(body) {
        return lambdaProxyResponse(statusCode, body);
    };
}

function gitLfsError(message, docUrl, requestId) {
    return {
        message: message,
        documentation_url: docUrl,
        request_id: requestId
    };
}

exports.lambdaReponse = lambdaResponse;
exports.lambdaProxyResponse = lambdaProxyResponse;
exports.gitLfsError = gitLfsError;
