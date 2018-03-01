jest.mock('../src/common/Datastore'); //has to be first or wallaby will blow up.

const ObjectProcessor = require('../src/common/ObjectProcessor');
const Datastore = require('../src/common/Datastore');

const K = require('kpromise');
const startWith = K.startWith;


describe('Object Processor', () => {
    const MISSING_KEY = "missingKey";
    const EXISTING_KEY = "existingKey";
    const EXISTING_KEY_SIZE = 64;
    const INTEGRATION_ENDPOINT = "gllApiIntegrationTestEndpoint";
    const VERIFY_URL_REGEX = new RegExp(`^https?://${INTEGRATION_ENDPOINT}/.*/verify$`);

    let processor = null;
    beforeEach(() => {
        processor = new ObjectProcessor(new Datastore(), INTEGRATION_ENDPOINT, "/test/resource/path", "unitTest");
    });

    afterEach(() => {
        Datastore.mockClear();
    });

    describe('uploads', () => {


        const uploadUrlFor = (key) => "UPLOAD_" + key;

        beforeAll(() => {
            Datastore.mockImplementation(() => {
                return {
                    exists: (key) => {
                        if(key === EXISTING_KEY) return startWith(true);
                        if(key === MISSING_KEY) return startWith(false);
                        throw new Error("Unhandled test exception: exist");
                    },
                    getUploadUrl: (key) => {
                        if(key === EXISTING_KEY) throw new Error("Should not be uploading this!");
                        if(key === MISSING_KEY) return startWith(uploadUrlFor(key));
                        throw new Error("Unhandled test exception: upload");
                    },
                }
            });
        });

        afterAll(() => {
            Datastore.mockRestore();
        });

        it('should should process valid requests', async() => {
            const given = {oid: MISSING_KEY, size: 5};

            const actual = await startWith(given)
                .then(processor.processUpload);

            expect.assertions(5);
            expect(actual.oid).toBe(MISSING_KEY);
            expect(actual.size).toBe(5);
            console.log(actual);
            expect(actual.error).toBeUndefined();
            expect(actual.actions.upload.href).toMatch(uploadUrlFor(MISSING_KEY));
            expect(actual.actions.verify.href).toMatch(VERIFY_URL_REGEX);
        });

        it('should skip uploads for existing objects', async() => {
            const given = {oid: EXISTING_KEY, size: EXISTING_KEY_SIZE};

            const actual = await startWith(given)
                .then(processor.processUpload);

            expect.assertions(4);
            expect(actual.oid).toBe(EXISTING_KEY);
            expect(actual.size).toBe(EXISTING_KEY_SIZE);
            expect(actual.error).toBeUndefined();
            expect(actual.actions).toBeUndefined();
        });

        it('should wrap individual object errors', async() => {
            const given = {oid: "boom", size: 1};

            const actual = await startWith(given)
                .then(processor.processUpload);

            expect.assertions(5);
            expect(actual.oid).toBe("boom");
            expect(actual.size).toBe(1);
            expect(actual.actions).toBeUndefined();
            expect(actual.error.code).toBe(500);
            expect(actual.error.message).toMatch(/Unhandled test exception/);
        });
    });

    describe('downloads', () => {
        const downloadUrlFor = (key) => "DOWNLOAD_" + key;

        beforeAll(() => {
            Datastore.mockImplementation(() => {
                return {
                    exists: (key) => {
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

        it('should process valid requests', async() => {
            const given = {oid: EXISTING_KEY, size: 5};

            const actual = await startWith(given)
                .then(processor.processDownload);

            expect.assertions(4);
            expect(actual.oid).toBe(EXISTING_KEY);
            expect(actual.size).toBe(5);
            expect(actual.error).toBeUndefined();
            expect(actual.actions.download.href).toBe(downloadUrlFor(EXISTING_KEY));
        });

        it('should give 404 for missing objects', async() => {
            const given = {oid: MISSING_KEY, size: 5};

            const actual = await startWith(given)
                .then(processor.processDownload);

            expect.assertions(4);
            expect(actual.oid).toBe(MISSING_KEY);
            expect(actual.size).toBe(5);
            expect(actual.error.code).toBe(404);
            expect(actual.actions).toBeUndefined();
        });

        it('should wrap individual object errors', async() => {
            const given = {oid: "boom", size: 1};

            const actual = await startWith(given)
                .then(processor.processDownload);

            expect.assertions(5);
            expect(actual.oid).toBe("boom");
            expect(actual.size).toBe(1);
            expect(actual.actions).toBeUndefined();
            expect(actual.error.code).toBe(500);
            expect(actual.error.message).toMatch(/Unhandled test exception/);
        });
    });

    describe('Verify', () => {

        beforeAll(() => {
            Datastore.mockImplementation(() => {
                return {
                    exists: (key) => {
                        if(key === EXISTING_KEY) return startWith(true);
                        if(key === MISSING_KEY) return startWith(false);
                        throw new Error("Unhandled test exception: exist");
                    },
                    getInfo: (key) => {
                        if(key === EXISTING_KEY) return startWith({ContentLength: EXISTING_KEY_SIZE});
                        if(key === MISSING_KEY) return startWith(null);
                        throw new Error("Unhandled test exception: verify");
                    }
                }
            });
        });

        afterAll(() => {
            Datastore.mockRestore();
        });

        it('Should verify correct object', async() => {
            const given = {oid: EXISTING_KEY, size: EXISTING_KEY_SIZE};

            const actual = await startWith(given)
                .then(processor.verify);

            expect.assertions(1);
            expect(actual).toEqual({
                result: "Verified",
                requested: given,
                found: given
            });
        });

        it('Should not verify incorrect object', async() => {
            const given = {oid: EXISTING_KEY, size: 12};

            const actual = await startWith(given)
                .then(processor.verify);

            expect.assertions(1);
            expect(actual).toEqual({
                result: "WrongSize",
                requested: given,
                found: {oid: EXISTING_KEY, size: EXISTING_KEY_SIZE}
            });
        })

        it('Should not verify missing object', async() => {
            const given = {oid: MISSING_KEY, size: EXISTING_KEY_SIZE};

            const actual = await startWith(given)
                .then(processor.verify);

            expect(actual).toEqual({
                result: "NotFound",
                requested: given,
                found: null
            });
        })
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
                    .then(processor.processUpload);

                expect.assertions(4);
                expect(actual.oid).toBe(MISSING_KEY);
                expect(actual.size).toBe(5);
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
                    .then(processor.processUpload);

                expect.assertions(4);
                expect(actual.oid).toBe(MISSING_KEY);
                expect(actual.size).toBe(5);
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
                    .then(processor.processDownload);

                expect.assertions(4);
                expect(actual.oid).toBe(MISSING_KEY);
                expect(actual.size).toBe(5);
                expect(actual.actions).toBeUndefined();
                expect(actual.error).toEqual(TEST_ERROR);
            });
        });
    });
});
