"use strict";

const K = require('kpromise');
const forEach = K.forEach;
const decorate = K.decorate;
const get = K.get;
const startWith = K.startWith;

const Action = require('./common/Action');
const LINK_EXPIRATION_TIME = 900;

class BatchProcessor {
    constructor(datastore) {
        this.datastore = datastore;
    }

    getUploadDirective(requestObject) {
        const directive = BatchProcessor.BlankDirectiveFor(requestObject);
        return startWith(directive)
            .then(decorate('actions', (directive) => {
                return startWith(directive)
                    .then(get('oid'))
                    .then(this.datastore.doesNotExist)
                    .then(this.datastore.getUploadUrl)
                    .then((url) => new Action(url, LINK_EXPIRATION_TIME))
                    .then((action) => {
                        return {upload: action}
                    })
                    ;
            }))
            .catch(() => directive) //skip upload actions for existing keys
            ;
    }

    getDownloadDirective(requestObject) {
        const directive = BatchProcessor.BlankDirectiveFor(requestObject);
        return startWith(directive)
            .then(decorate('actions', (directive) => {
                return startWith(directive)
                    .then(get('oid'))
                    .then(this.datastore.exists)
                    .then(this.datastore.getDownloadUrl)
                    .then((url) => new Action(url, LINK_EXPIRATION_TIME))
                    .then((action) => {
                        return {download: action}
                    })
                    ;
            }))
            .catch((e) => {
                directive.error = {
                    code: 404,
                    message: `Object ${directive.oid} not exist.`
                };
                return directive;
            })
            ;
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
