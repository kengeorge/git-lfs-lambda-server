"use strict";

const K = require('kpromise');
const forEach = K.forEach;
const decorate = K.decorate;
const get = K.get;
const startWith = K.startWith;
const Action = require('./common/Action');

class BatchProcessor {
    constructor(datastore, transferType) {
        this.datastore = datastore;
        this.transferType = transferType;

        this.toBatchResponseFormat = this.toBatchResponseFormat.bind(this);
    }

    processUpload(requestObjects) {
        return this.process(requestObjects, true);
    }

    processDownload(requestObjects) {
        return this.process(requestObjects, false);
    }

    process(requestObjects, isUpload) {
        return startWith(requestObjects)
            .then(forEach(BatchProcessor.objectRequestToObjectResponse))
            .then(forEach(decorate('actions', (obj) => {
                return startWith(obj)
                    .then(get('oid'))
                    .then(this.datastore.exists)
                    .then(isUpload ? this.datastore.getUploadUrl : this.datastore.getDownloadUrl)
                    .then(BatchProcessor.toAction)
                    .then((action) => isUpload ? {upload: action} : {download: action});
                //TODO refactor to catch exist failure
            })))
            .then(this.toBatchResponseFormat)
            ;
    }

    static objectRequestToObjectResponse(item) {
        return {
            oid: item.oid,
            size: item.size,
            authenticated: true,
            actions: {},
        };
    }

    static toAction(url) {
        return new Action(url, 900);
    }

    toBatchResponseFormat(objectResponses) {
        return {
            transfer: this.transferType,
            objects: objectResponses
        };
    }
}

module.exports = BatchProcessor;
