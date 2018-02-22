"use strict";

const K = require('kpromise');
const decorate = K.decorate;
const get = K.get;
const startWith = K.startWith;

const Action = require('./common/Action');
const LINK_EXPIRATION_TIME = 900;

class BatchProcessor {
    constructor(datastore) {
        this.datastore = datastore;
        this.getUploadDirective = this.getUploadDirective.bind(this);
        this.getDownloadDirective = this.getDownloadDirective.bind(this);
    }

    getUploadDirective(requestObject) {

        const directive = BatchProcessor.BlankDirectiveFor(requestObject);

        return startWith(directive.oid)
            .then(this.datastore.exists)
            .then((exists) => {
                //If we already have this object, no action is necessary.
                if(exists) return directive;

                //otherwise, populate directive with upload actions
                return startWith(directive)
                    .then(decorate('actions', (directive) => {
                        return startWith(directive)
                            .then(get('oid'))
                            .then(this.datastore.getUploadUrl)
                            .then((url) => new Action(url, LINK_EXPIRATION_TIME))
                            .then((action) => {
                                return {upload: action}
                            })
                    }))
            })
            .catch((e) => {
                console.log("Wrapping upload error: " + JSON.stringify(e, null, 2));

                directive.error = {
                    code: e.code,
                    message: e.message
                };

                return directive;
            });
    }

    getDownloadDirective(requestObject) {
        const directive = BatchProcessor.BlankDirectiveFor(requestObject);

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
                    .then(decorate('actions', (directive) => {
                        return startWith(directive)
                            .then(get('oid'))
                            .then(this.datastore.getDownloadUrl)
                            .then((url) => new Action(url, LINK_EXPIRATION_TIME))
                            .then((action) => {
                                return {download: action}
                            });
                    }));
            })
            .catch((e) => {
                console.log("Wrapping download error: " + JSON.stringify(e, null, 2));

                directive.error = {
                    code: e.code,
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

module.exports = BatchProcessor;
