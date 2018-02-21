jest.mock('../common/Datastore'); //has to be first or wallaby will blow up.

const BatchProcessor = require('../BatchProcessor');
const Datastore = require('../common/Datastore');

const TRANSFER_TYPE = "TEST_TRANSFER_TYPE";
const K = require('kpromise');
const failWith = K.failWith;

const uploadUrlFor = (key) => "UPLOAD_" + key;
const downloadUrlFor = (key) => "DOWNLOAD_" + key;

const MISSING_KEY = "missingKeyA";
const EXISTING_KEY = "existingKeyA";

describe('BatchProcessor', () => {

    let processor = null;
    beforeEach(() => {
        processor = new BatchProcessor(new Datastore(), TRANSFER_TYPE);
    });

    afterEach(() => {
        Datastore.mockClear();
    });

    describe('Uploads', () => {

        beforeAll(() => {
            Datastore.mockImplementation(() => {
                return {
                    exists: (key) => {
                        if(key === MISSING_KEY || key === MISSING_KEY_B) return failWith(key);
                        return key;
                    },
                    doesNotExist: (key) => {
                        if(key !== MISSING_KEY && key !== MISSING_KEY_B) return failWith(key);
                        return key;
                    },
                    getDownloadUrl: (key) => {
                        return failWith(key + " should not get here!");
                    },
                    getUploadUrl: (key) => {
                        if(key !== MISSING_KEY && key !== MISSING_KEY_B) return failWith(key + " should not be here!");
                        return uploadUrlFor(key);
                    },
                }
            });
        });


        it('Should process an upload request.', async() => {
            const given = {oid: MISSING_KEY, size: 5};

            const actual = await processor.getUploadDirective(given);

            expect.assertions(3);
            expect(actual.oid).toBe(MISSING_KEY);
            expect(actual.error).toBeUndefined();
            expect(actual.actions.upload.href).toBe(uploadUrlFor(MISSING_KEY));
        });

        it('Should skip downloads for existing objects', async() => {
            const given = {oid: EXISTING_KEY, size: 5};

            const actual = await processor.getUploadDirective(given);

            expect.assertions(3);
            expect(actual.oid).toBe(EXISTING_KEY);
            expect(actual.error).toBeUndefined();
            expect(actual.actions).toBeUndefined();
        });
    });

    describe('Downloads', () => {

        beforeAll(() => {
            Datastore.mockImplementation(() => {
                return {
                    exists: (key) => {
                        if(key === MISSING_KEY) return failWith(key);
                        return key;
                    },
                    doesNotExist: (key) => {
                        if(key !== MISSING_KEY) return failWith(key);
                        return key;
                    },
                    getDownloadUrl: (key) => {
                        if(key === MISSING_KEY) return failWith(key + " should not be here!");
                        return downloadUrlFor(key);
                    },
                    getUploadUrl: (key) => {
                        return failWith(key + " should not get here!");
                    },
                }
            });
        });


        it('Should process a download request.', async() => {
            const given = {oid: EXISTING_KEY, size: 5};

            const actual = await processor.getDownloadDirective(given);

            expect.assertions(3);
            expect(actual.oid).toBe(EXISTING_KEY);
            expect(actual.error).toBeUndefined();
            expect(actual.actions.download.href).toBe(downloadUrlFor(EXISTING_KEY));
        });

        it('Should give 404 for missing objects', async() => {
            const given = {oid: MISSING_KEY, size: 5};

            const actual = await processor.getDownloadDirective(given);

            expect.assertions(3);
            expect(actual.oid).toBe(MISSING_KEY);
            expect(actual.error.code).toBe(404);
            expect(actual.actions).toBeUndefined();
        });
    });
});