jest.mock('../src/common/Datastore'); //has to be first or wallaby will blow up.

const BatchProcessor = require('../src/BatchProcessor');
const Datastore = require('../src/common/Datastore');

const TRANSFER_TYPE = "TEST_TRANSFER_TYPE";
const K = require('kpromise');
const startWith = K.startWith;

describe('BatchProcessor', () => {

    const MISSING_KEY = "missingKey";
    const EXISTING_KEY = "existingKey";


    let processor = null;
    beforeEach(() => {
        processor = new BatchProcessor(new Datastore(), TRANSFER_TYPE);
    });

    afterEach(() => {
        Datastore.mockClear();
    });

    describe('Uploads', () => {

        const uploadUrlFor = (key) => "UPLOAD_" + key;

        beforeAll(() => {
            Datastore.mockImplementation(() => {
                return {
                    exists: (key) => {
                        console.log(key);
                        if(key === EXISTING_KEY) return startWith(true);
                        if(key === MISSING_KEY) return startWith(false);
                        throw new Error("Unhandled test exception: exist");
                    },
                    getUploadUrl: (key) => {
                        if(key === EXISTING_KEY) throw new Error("Should not be uploading this!");
                        if(key === MISSING_KEY) return startWith(uploadUrlFor(key));
                        throw new Error("Unhandled test exception: upload");
                    }
                }
            });
        });

        it('Should process an upload request.', async() => {
            const given = {oid: MISSING_KEY, size: 5};

            const actual = await startWith(given)
                .then(processor.getUploadDirective);

            expect.assertions(3);
            expect(actual.oid).toBe(MISSING_KEY);
            expect(actual.error).toBeUndefined();
            expect(actual.actions.upload.href).toMatch(uploadUrlFor(MISSING_KEY));
        });

        it('Should skip uploads for existing objects', async() => {
            const given = {oid: EXISTING_KEY, size: 5};

            const actual = await startWith(given)
                .then(processor.getUploadDirective);

            expect.assertions(3);
            console.log(actual);
            expect(actual.oid).toBe(EXISTING_KEY);
            expect(actual.error).toBeUndefined();
            expect(actual.actions).toBeUndefined();
        });
    });

    describe('Downloads', () => {
        const downloadUrlFor = (key) => "DOWNLOAD_" + key;

        beforeAll(() => {
            Datastore.mockImplementation(() => {
                return {
                    exists: (key) => {
                        console.log(key);
                        if(key === EXISTING_KEY) return startWith(true);
                        if(key === MISSING_KEY) return startWith(false);
                        throw new Error("Unhandled test exception");
                    },
                    getDownloadUrl: (key) => {
                        if(key === EXISTING_KEY) return startWith(downloadUrlFor(key));
                        if(key === MISSING_KEY) throw new Error("Should not be uploading this!");
                        throw new Error("Unhandled test exception");
                    }
                }
            });
        });

        it('Should process a download request.', async() => {
            const given = {oid: EXISTING_KEY, size: 5};

            const actual = await startWith(given)
                .then(processor.getDownloadDirective);

            expect.assertions(3);
            expect(actual.oid).toBe(EXISTING_KEY);
            expect(actual.error).toBeUndefined();
            expect(actual.actions.download.href).toBe(downloadUrlFor(EXISTING_KEY));
        });

        it('Should give 404 for missing objects', async() => {
            const given = {oid: MISSING_KEY, size: 5};

            const actual = await startWith(given)
                .then(processor.getDownloadDirective);

            expect.assertions(3);
            expect(actual.oid).toBe(MISSING_KEY);
            expect(actual.error.code).toBe(404);
            expect(actual.actions).toBeUndefined();
        });
    });

    describe('Other errors', () => {
        const TEST_ERROR = {
            code: 100,
            message: "datastore blew up"
        };

        describe('Exist failures', () => {

            beforeAll(() => {
                Datastore.mockImplementation(() => {
                    return {
                        exists: () => {
                            throw TEST_ERROR;
                        }
                    }
                })
            });

            it('Should be wrapped', async() => {
                const given = {oid: MISSING_KEY, size: 5};

                const actual = await startWith(given)
                    .then(processor.getUploadDirective);

                expect.assertions(3);
                expect(actual.oid).toBe(MISSING_KEY);
                expect(actual.actions).toBeUndefined();
                expect(actual.error).toEqual(TEST_ERROR);
            });
        });

        describe('Upload failures', () => {

            beforeAll(() => {
                Datastore.mockImplementation(() => {
                    return {
                        exists: () => {
                            return startWith(false);
                        },
                        getUploadUrl: () => {
                            throw TEST_ERROR;
                        }
                    }
                })
            });

            it('Should be wrapped', async() => {
                const given = {oid: MISSING_KEY, size: 5};

                const actual = await startWith(given)
                    .then(processor.getUploadDirective);

                expect.assertions(3);
                expect(actual.oid).toBe(MISSING_KEY);
                expect(actual.actions).toBeUndefined();
                expect(actual.error).toEqual(TEST_ERROR);
            });
        });

        describe('Download failures', () => {

            beforeAll(() => {
                Datastore.mockImplementation(() => {
                    return {
                        exists: () => {
                            return startWith(true);
                        },
                        getDownloadUrl: () => {
                            throw TEST_ERROR;
                        }
                    }
                })
            });

            it('Should be wrapped', async() => {
                const given = {oid: MISSING_KEY, size: 5};

                const actual = await startWith(given)
                    .then(processor.getDownloadDirective);

                expect.assertions(3);
                expect(actual.oid).toBe(MISSING_KEY);
                expect(actual.actions).toBeUndefined();
                expect(actual.error).toEqual(TEST_ERROR);
            });
        });
    });
});
