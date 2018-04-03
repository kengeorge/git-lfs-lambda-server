const K = require('kpromise');
const startWith = K.startWith;
const get = K.get;
const forEach = K.forEach;
const decorate = K.decorate;

const Handler = require('./Handler');
const Action = require('./Action');
const TRANSFER_TYPE = "basic";
const LINK_EXPIRATION_TIME = 900;

class ObjectHandler extends Handler {

    constructor(operation, datastore, endpoint, resourcePath) {
        super();

        this.datastore = datastore;
        this.resourcePath = resourcePath;

        this.getVerifyUrl = () => {
            const resource = this.resourcePath;
            return `http://${endpoint}${resource}/verify`;
        };

        this.getVerifyAction = (key) => {
            return startWith(key)
                .then(this.getVerifyUrl)
                .then((url) => new Action(url));
        };

        this.getUploadAction = (key) => {
            return startWith(key)
                .then(this.datastore.getUploadUrl)
                .then((url) => new Action(url, LINK_EXPIRATION_TIME));
        };

        this.getDownloadAction = (key) => {
            return startWith(key)
                .then(this.datastore.getDownloadUrl)
                .then((url) => new Action(url, LINK_EXPIRATION_TIME));
        };

        this.toResponseFormat = (responses) => {
            return {
                transfer: TRANSFER_TYPE,
                objects: responses
            }
        };

        this.verifyTransferType = (request) =>{
            if(request.transfers && !request.transfers.includes(TRANSFER_TYPE)) {
                throw {
                    statusCode: 422,
                    message: `Unsupported transfer type: [${request.transfers}]`
                };
            }
            return request;
        };

        this.handleUpload = (request) => {
            return startWith(request.objects)
                .then(forEach((requestObject) => {

                    const directive = ObjectHandler.BlankDirectiveFor(requestObject);

                    return startWith(directive.oid)
                        .then(this.datastore.exists)
                        .then((exists) => {
                            //If we already have this object, no action is necessary.
                            if(exists) return directive;

                            //otherwise, populate directive with upload
                            return startWith(directive)
                                .then(decorate('actions', (d) => {
                                    return startWith({})
                                        .then(decorate('upload', () => this.getUploadAction(d.oid)))
                                        .then(decorate('verify', () => this.getVerifyAction(d.oid)))
                                }))
                                ;
                        })
                        .catch((e) => {
                            console.log("Wrapping upload error: " + JSON.stringify(e, null, 2));

                            directive.error = {
                                code: e.code ? e.code : 500,
                                message: e.message
                            };

                            return directive;
                        });
                }))
        };

        this.handleDownload = (request) => {
            return startWith(request.objects)
                .then(forEach((requestObject) => {
                    const directive = ObjectHandler.BlankDirectiveFor(requestObject);

                    return startWith(directive.oid)
                        .then(this.datastore.exists)
                        .then((exists) => {
                            if(!exists) {
                                directive.error = {
                                    code: 404,
                                    message: `Object ${directive.oid} not exist.`
                                };
                                return directive;
                            }

                            return startWith(directive)
                                .then(decorate('actions', (directive) =>
                                    startWith({})
                                        .then(decorate('download', () => this.getDownloadAction(directive.oid)))
                                ));
                        })
                        .catch((e) => {
                            console.log("Wrapping download error: " + JSON.stringify(e, null, 2));

                            directive.error = {
                                code: e.code ? e.code : 500,
                                message: e.message
                            };

                            return directive;
                        });
                }))
        };

        this.handleVerify = (request) => {
            return startWith(request)
                .then(get('oid'))
                .then(this.datastore.getInfo)
                .then((info) => {
                    if(info == null) return {
                        result: "NotFound",
                        requested: request,
                        found: null
                    };

                    const result = info == null ? "NotFound"
                        : info.ContentLength === request.size ? "Verified"
                            : "WrongSize";

                    const found = info == null ? null
                        : {oid: request.oid, size: info.ContentLength};

                    return {
                        result: result,
                        requested: request,
                        found: found
                    };
                })
                .then((v) => {
                    switch(v.result) {
                        case "Verified":
                            return request;
                        case "NotFound":
                            throw {statusCode: 404, message: `Object ${request.oid} not found.`};
                        case "WrongSize":
                            throw {
                                statusCode: 411,
                                message: `Expected object of size ${request.size} but found ${v.found.size}`
                            };
                    }
                    throw new Error(`Unknown verification result ${v.result}`);
                });
        }

        switch(operation) {
            case "upload":
                this.process = (request) => {
                    return startWith(request)
                        .then(this.verifyTransferType)
                        .then(this.handleUpload)
                        .then(this.toResponseFormat)
                };
                break;
            case "download":
                this.process = (request) => {
                    return startWith(request)
                        .then(this.verifyTransferType)
                        .then(this.handleDownload)
                        .then(this.toResponseFormat)
                };
                break;
            case "verify":
                this.process = this.handleVerify;
                break;
            default:
                throw new TypeError(`Unsupported object operation: [${operation}]`);
        }
    }




    getDocUrl(statusCode) {
        return "https://github.com/git-lfs/git-lfs/blob/master/docs/api/batch.md";
    }

    static BlankDirectiveFor(item) {
        return {
            oid: item.oid,
            size: item.size,
            authenticated: true,
        };
    }

}

module.exports = ObjectHandler;