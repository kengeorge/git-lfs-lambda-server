const TEST_BUCKET_NAME = "TEST_BUCKET_NAME";
const MISSING_KEY = "missingKey";
const EXISTING_KEY = "existingKey";
const startWith = require('kpromise').startWith;

function makeUrl(operation, bucket, key) {
    return `${operation}:${bucket}/${key}`;
}


describe('S3Datastore', () => {

    let datastore = null;

    beforeAll(() => {
        const mockS3 = jest.fn(() => ({
            headObject: (params) => {
                return {
                    promise: () => {
                        if(params.Key === EXISTING_KEY) return Promise.resolve({
                            ContentLength: 64
                        });

                        if(params.Key === MISSING_KEY) return Promise.reject({
                            code: "NotFound",
                            message: "Mock s3: no such key " + params.Key
                        });

                        return Promise.reject("FakeError");
                    }
                }
            },
            getSignedUrl: (operation, params, callback) => {
                if(operation === 'putObject' && params.Key === MISSING_KEY) {
                    return callback(null, makeUrl(operation, params.Bucket, params.Key));
                }

                if(operation === 'getObject' && params.Key === EXISTING_KEY) {
                    return callback(null, makeUrl(operation, params.Bucket, params.Key));
                }

                return callback("FakeError");
            }
        }));

        jest.setMock('aws-sdk', {
            S3: mockS3
        });
    });

    beforeEach(() => {
        const S3Datastore = require('../src/common/S3Datastore');
        datastore = new S3Datastore(TEST_BUCKET_NAME);
    });

    afterAll(() => {
        jest.resetModules();
    });

    it('Should produce a signed upload url', async() => {
        const given = MISSING_KEY;

        const actual = await startWith(given).then(datastore.getUploadUrl);

        expect.assertions(1);
        expect(actual).toBe(makeUrl("putObject", TEST_BUCKET_NAME, given));
    });

    it('Should produce a signed download url', async() => {
        const given = EXISTING_KEY;

        const actual = await startWith(given).then(datastore.getDownloadUrl);

        expect.assertions(1);
        expect(actual).toBe(makeUrl("getObject", TEST_BUCKET_NAME, given));
    });

    it('Should return true if exists', async() => {
        const given = EXISTING_KEY;

        const actual = await startWith(given).then(datastore.exists);

        expect.assertions(1);
        expect(actual).toBe(true);
    });

    it('Should return false if does not exist', async() => {
        const given = MISSING_KEY;

        const actual = await startWith(given).then(datastore.exists);

        expect.assertions(1);
        expect(actual).toBe(false);
    });

    it('Should return info for existing objects', async() => {
        const given = EXISTING_KEY;

        const actual = await startWith(given).then(datastore.getInfo);

        expect.assertions(1);
        expect(actual.ContentLength).toBe(64);
    });

    it('Should return null info for missing objects', async() =>{
        const given = MISSING_KEY;

        expect.assertions(1);
        const actual = await startWith(given).then(datastore.getInfo);

        expect(actual).toBeNull();
    });

    it('Should throw other errors when fetching info', () => {
        expect.assertions(1);
        return expect(datastore.exists("badKey")).rejects.toThrow(/FakeError/);
    });

    it('Should throw other errors', () => {
        expect.assertions(1);
        return expect(datastore.exists("badKey")).rejects.toThrow(/FakeError/);
    });

    it('Should throw other upload URL errors', () => {
        expect.assertions(1);
        return expect(datastore.getUploadUrl("badKey")).rejects.toThrowError(/FakeError/);
    });

    it('Should throw other download URL errors', () => {
        expect.assertions(1);
        return expect(datastore.getDownloadUrl("badKey")).rejects.toThrowError(/FakeError/);
    });

});
