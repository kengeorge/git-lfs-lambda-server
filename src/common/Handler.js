const K = require('kpromise');
const startWith = K.startWith;

const responses = require('./responses');
const lambdaResponse = responses.lambdaResponse;
const gitLfsError = responses.gitLfsError;

class Handler {

    constructor() {
        this.handle = this.handle.bind(this);
        this.process = this.process.bind(this);
    }

    handle(event, context, callback) {
        let request = JSON.parse(event.body);

        return startWith(request)
            .then(this.process)
            .then(lambdaResponse(200))
            .then((result) => callback(null, result))
            .catch((err) => {
                console.log(err);
                const code = err.statusCode ? err.statusCode : 500;
                return startWith(gitLfsError(err.message, this.getDocUrl(code), context.awsRequestId))
                    .then(lambdaResponse(code))
                    .then((r) => callback(r, null))
            });
    }

    process(request) {
    }

    getDocUrl(statusCode) {
    }

}

module.exports = Handler;