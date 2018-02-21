"use strict";

const K = require('kpromise');
const forEach = K.forEach;
const decorate = K.decorate;
const get = K.get;
const startWith = K.startWith;
const passBefore = K.passBefore;

const Action = require('./common/Action');

class BatchProcessor {
    constructor(datastore, transferType) {
        this.datastore = datastore;
        this.transferType = transferType;

        this.toBatchResponseFormat = this.toBatchResponseFormat.bind(this);
        this.process = this.process.bind(this);
        this.populateDirective = this.populateDirective.bind(this);
    }

    processUpload(requestObjects) {
        return startWith(requestObjects)
            .then(forEach(passBefore(this.process, true)))
            .then(this.toBatchResponseFormat)
        ;
    }

    processDownload(requestObjects) {
        return startWith(requestObjects)
            .then(forEach(passBefore(this.process, false)))
            .then(this.toBatchResponseFormat)
        ;
    }

    process(requestObject, isUpload) {
        return startWith(requestObject)
            .then(BatchProcessor.objectRequestToObjectResponse)
            .then(passBefore(this.populateDirective, isUpload))
    }

    populateDirective(directive, isUpload) {
        return startWith(directive)
            .then(decorate('actions', (d) => {
                return startWith(d)
                    .then(get('oid'))
                    .then(this.datastore.exists)
                    .then(isUpload ? this.datastore.getUploadUrl : this.datastore.getDownloadUrl)
                    .then(BatchProcessor.toAction)
                    .then((action) => isUpload ? {upload: action} : {download: action})
            }))
            .catch(() =>{
                directive.error = {
                    code: 404,
                    message: `Object ${directive.oid} not exist.`
                };
                return directive;
            })
        ;
    }

    static objectRequestToObjectResponse(item) {
        return {
            oid: item.oid,
            size: item.size,
            authenticated: true,
        };
    }

    static toAction(url) {
        return new Action(url, 900);
    }

    toBatchResponseFormat(objectResponses) {
        console.log(objectResponses);
        return {
            transfer: this.transferType,
            objects: objectResponses
        };
    }
}

module.exports = BatchProcessor;
