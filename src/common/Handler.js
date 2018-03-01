const K = require('kpromise');
const startWith = K.startWith;

class Handler {

    constructor() {
        this.handle = this.handle.bind(this);
        this.process = this.process.bind(this);
    }

    handle(event, context, callback) {
        let request = !event.body || event.body === ""
            ? null
            : JSON.parse(event.body);

        return startWith(request)
            .then(this.process)
            .then(Handler.lambdaResponse(200))
            .then((result) => callback(null, result))
            .catch((err) => {
                const code = err.statusCode ? err.statusCode : 500;
                return startWith(Handler.gitLfsError(
                    err.message,
                    this.getDocUrl(code),
                    context.awsRequestId))
                    .then(Handler.lambdaResponse(code))
                    .then((r) => callback(r));
            });
    }

    static gitLfsError(message, docUrl, requestId) {
        return {
            message: message,
            documentation_url: docUrl,
            request_id: requestId
        };
    }

    static lambdaResponse(statusCode) {
        return (body) => {
            return {
                statusCode: statusCode,
                headers: {
                    'content-type': 'application/json',
                },
                body: JSON.stringify(body)
            };
        };
    }

    process(request) {
    }

    getDocUrl(statusCode) {
        return "EMPTY DOC";
    }

}

module.exports = Handler;