const AWS = require('aws-sdk-mock');

AWS.mock('S3', 'getSignedUrl', function(operation, params, callback) {
    console.log("TEST CALL WITH :" + operation);
    callback(null, makeUrl(operation, params.Bucket, params.Key));
});

const S3Datastore = require('../common/S3Datastore');

function makeUrl(operation, bucket, key) {
    return `${operation}_URL_FOR_${bucket}_${key}`;
}


describe('S3Datastore', () => {

    const TEST_BUCKET_NAME = "TEST_BUCKET_NAME";

    beforeAll(() => {
    });

    let datastore = null;
    beforeEach(() => {
        datastore = new S3Datastore(TEST_BUCKET_NAME);
    });

    it('Should produce a signed upload url', async() => {
        const givenKey = "UPLOAD_KEY";

        const expected = makeUrl("putObject", TEST_BUCKET_NAME, givenKey);

        await expect(datastore.getUploadUrl(givenKey)).resolves.toBe(expected);
    });

    it('Should produce a signed download url', async() => {
        const givenKey = "DOWNLOAD_KEY";

        const expected = makeUrl("getObject", TEST_BUCKET_NAME, givenKey);

        await expect(datastore.getDownloadUrl(givenKey)).resolves.toBe(expected);
    });

});
