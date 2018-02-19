const AWS = require('aws-sdk-mock');
const S3Datastore = require('../common/S3Datastore');
const TEST_BUCKET_NAME = "TEST_BUCKET_NAME";

function makeUrl(operation, bucket, key) {
    return `${operation}_URL_FOR_${bucket}_${key}`;
}

describe('S3Datastore', () => {

    let datastore = null;
    beforeEach(() => {
        datastore = new S3Datastore(TEST_BUCKET_NAME);
    });

    describe('Successful responses', () => {
        beforeAll(() => {
            AWS.restore();
            AWS.mock('S3', 'getSignedUrl', (operation, params, callback) => {
                return callback(null, makeUrl(operation, params.Bucket, params.Key));
            });

            AWS.mock('S3', 'headObject', (params, callback) => {
                return callback(null, "mockHeadResponse");
            });
        });

        let datastore = null;
        beforeEach(() => {
            datastore = new S3Datastore(TEST_BUCKET_NAME);
        });

        it('Should produce a signed upload url', () => {
            const givenKey = "UPLOAD_KEY";

            const expected = makeUrl("putObject", TEST_BUCKET_NAME, givenKey);

            expect.assertions(1);
            expect(datastore.getUploadUrl(givenKey)).resolves.toBe(expected);
        });

        it('Should produce a signed download url', () => {
            const givenKey = "DOWNLOAD_KEY";

            const expected = makeUrl("getObject", TEST_BUCKET_NAME, "DOWNLOAD_KEY");

            expect.assertions(1);
            expect(datastore.getDownloadUrl(givenKey)).resolves.toBe(expected);
        });

        it('Should return key if exists when checking for exists', () => {
            expect.assertions(1);
            expect(datastore.exists("VALID_KEY")).resolves.toBe("VALID_KEY");
        });

        it('Should return null if key exists when checking for not exists', () => {
            expect.assertions(1);
            expect(datastore.doesNotExist("INVALID_KEY")).resolves.toBeNull();
        });
    });

    describe('Error responses', () => {

        beforeAll(() => {
            AWS.restore();
            AWS.mock('S3', 'getSignedUrl', (operation, params, callback) => {
                return callback(`failed_${operation}_${params.Key}`);
            });

            AWS.mock('S3', 'headObject', (params, callback) => {
                return callback(`failed_${params.Key}`, null);
            });
        });

        it('Should fail if cannot produce an upload URL', () => {
            expect.assertions(1);
            expect(datastore.getUploadUrl("INVALID_KEY")).rejects.toThrow("failed_putObject_INVALID_KEY");
        });

        it('Should return null if key does not exist when exists', () => {
            expect.assertions(1);
            expect(datastore.exists("MISSING_KEY")).resolves.toBeNull();
        });

        it('Should return key if key does not exist when checking for not exists', () => {
            expect.assertions(1);
            expect(datastore.doesNotExist("VALID_KEY")).resolves.toBe("VALID_KEY");
        });
    });


});
