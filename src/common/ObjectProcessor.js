"use strict";

const K = require('kpromise');
const decorate = K.decorate;
const get = K.get;
const startWith = K.startWith;

const Action = require('./Action');
const LINK_EXPIRATION_TIME = 900;

class ObjectProcessor {
    constructor(datastore, endpoint, resourcePath) {
        this.datastore = datastore;
        this.resourcePath = resourcePath;

        this.processUpload = this.processUpload.bind(this);
        this.processDownload = this.processDownload.bind(this);
        this.verify = this.verify.bind(this);

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
    }

    processUpload(requestObject) {

        const directive = ObjectProcessor.BlankDirectiveFor(requestObject);

        return startWith(directive.oid)
            .then(this.datastore.exists)
            .then((exists) => {
                //If we already have this object, no action is necessary.
                if(exists) return directive;

                //otherwise, populate directive with upload
                return startWith(directive)
                    .then(decorate('actions', (directive) =>
                        startWith({})
                            .then(decorate('upload', () => this.getUploadAction(directive.oid)))
                            .then(decorate('verify', () => this.getVerifyAction(directive.oid)))
                            .then(K.peek)
                    ));
            })
            .catch((e) => {
                console.log("Wrapping upload error: " + JSON.stringify(e, null, 2));

                directive.error = {
                    code: e.code ? e.code : 500,
                    message: e.message
                };

                return directive;
            });
    }

    verify(requestObject) {
        return startWith(requestObject)
            .then(get('oid'))
            .then(this.datastore.getInfo)
            .then((info) => {
                if(info == null) return {
                    result: "NotFound",
                    requested: requestObject,
                    found: null
                };

                const result = info == null ? "NotFound"
                    : info.ContentLength === requestObject.size ? "Verified"
                    : "WrongSize";

                const found = info == null ? null
                    : {oid: requestObject.oid, size: info.ContentLength};

                return {
                    result: result,
                    requested: requestObject,
                    found: found
                };
            })
    }

    processDownload(requestObject) {
        const directive = ObjectProcessor.BlankDirectiveFor(requestObject);

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
    }

    static BlankDirectiveFor(item) {
        return {
            oid: item.oid,
            size: item.size,
            authenticated: true,
        };
    }

}

module.exports = ObjectProcessor;
