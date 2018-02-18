"use strict";

const K = require('kpromise');
const forEach = K.forEach;
const decorate = K.decorate;
const get = K.get;
const startWith = K.startWith;


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
            .then(forEach(this.objectRequestToObjectResponse))
            .then(forEach(decorate('actions', (obj) => {
                return startWith(obj)
                    .then(get('oid'))
                    .then(isUpload ? this.datastore.getUploadUrl : this.datastore.getDownloadUrl)
                    .then(this.toAction)
                    .then((action) => isUpload ? {upload: action} : {download: action});
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
        return {
            href: url,
            expires_in: 900
        };
    }

    toBatchResponseFormat(objectResponses) {
        return {
            transfer: this.transferType,
            objects: objectResponses
        };
    }
}

module.exports = BatchProcessor;
