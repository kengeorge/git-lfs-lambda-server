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

    afterAll(() => {
        AWS.restore();
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
            return expect(datastore.getUploadUrl(givenKey)).resolves.toBe(expected);
        });

        it('Should produce a signed download url', () => {
            const givenKey = "DOWNLOAD_KEY";

            const expected = makeUrl("getObject", TEST_BUCKET_NAME, "DOWNLOAD_KEY");

            expect.assertions(1);
            return expect(datastore.getDownloadUrl(givenKey)).resolves.toBe(expected);
        });

        it('Should return key if exists when checking for exists', () => {
            expect.assertions(1);
            return expect(datastore.exists("VALID_KEY")).resolves.toBe("VALID_KEY");
        });

        it('Should throw if key exists when checking for not exists', () => {
            expect.assertions(1);
            return expect(datastore.doesNotExist("INVALID_KEY")).rejects.toThrow("INVALID_KEY");
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
            return expect(datastore.getUploadUrl("INVALID_KEY")).rejects.toThrow("failed_putObject_INVALID_KEY");
        });

        it('Should fail if cannot produce download URL', () => {
            expect.assertions(1);
            return expect(datastore.getDownloadUrl("INVALID_KEY")).rejects.toThrow("failed_getObject_INVALID_KEY");
        });

        it('Should throw if key does not exist when exists', async() => {
            let actual = null;
            await datastore.exists("MISSING_KEY")
                .catch((thrown) =>{
                    actual = thrown;
                });

            expect.assertions(2);
            expect(actual.code).toBe(404);
            expect(actual.message).toMatch(/MISSING_KEY/);

        });

        it('Should return key if key does not exist when checking for not exists', () => {
            const given = "validKey_doesNotExist";
            expect.assertions(1);
            return expect(datastore.doesNotExist(given)).resolves.toBe(given);
        });
    });


});
