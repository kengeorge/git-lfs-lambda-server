jest.mock('../src/common/Datastore'); //has to be first or wallaby will blow up.

const ObjectHandler = require('../src/common/ObjectHandler');
const Datastore = require('../src/common/Datastore');

const K = require('kpromise');
const startWith = K.startWith;


describe('NEW Object Handler', () => {
    const MISSING_KEY_1 = "missingKey1";
    const MISSING_KEY_2 = "missingKey2";
    const EXISTING_KEY_1 = "existingKey1";
    const EXISTING_KEY_2 = "existingKey2";
    const EXISTING_KEY_SIZE = 64;
    const INTEGRATION_ENDPOINT = "gllApiIntegrationTestEndpoint";
    const TRANSFER_TYPE = "basic";
    const VERIFY_URL_REGEX = new RegExp(`^https?://${INTEGRATION_ENDPOINT}/.*/verify$`);

    const callback = jest.fn();
    const requestWithBody = (body) => {
        return {
            event: {
                body: JSON.stringify(body),
                requestContext: {
                    stage: "integrationTest"
                },
                resource: "/integration/test/resource"
            },
            context: {
                awsRequestId: "testRequestId"
            },
            callback: callback
        };
    };
    let handler = null;

    afterEach(() => {
        Datastore.mockClear();
        callback.mockReset();
    });

    describe('uploads', () => {

        const uploadUrlFor = (key) => "UPLOAD_" + key;

        beforeAll(() => {
            Datastore.mockImplementation(() => {
                return {
                    exists: (key) => {
                        if(key === EXISTING_KEY_1) return startWith(true);
                        if(key === MISSING_KEY_1) return startWith(false);
                        if(key === MISSING_KEY_2) return startWith(false);
                        throw new Error("Unhandled test exception: exist");
                    },
                    getUploadUrl: (key) => {
                        if(key === EXISTING_KEY_1) throw new Error("Should not be uploading this!");
                        if(key === MISSING_KEY_1) return startWith(uploadUrlFor(key));
                        if(key === MISSING_KEY_2) return startWith(uploadUrlFor(key));
                        throw new Error("Unhandled test exception: upload");
                    },
                }
            });
        });

        beforeEach(() => {
            handler = new ObjectHandler("upload", new Datastore(), INTEGRATION_ENDPOINT, "/test/resource/path");
        });

        it('should refuse unknown transfer type', async() => {

            const given = requestWithBody({transfers: ["somethingWeird"]});
            await handler.handle(given.event, given.context, given.callback);

            expect.assertions(5);
            expect(callback).toHaveBeenCalledTimes(1);

            const response = callback.mock.calls[0][0];
            expect(response.statusCode).toBe(422)

            const actual = JSON.parse(response.body);
            expect(actual.message).toMatch(/transfer type/);
            expect(actual.message).toMatch(/somethingWeird/);
            expect(actual.documentation_url).toMatch(/^http/);
        });

        it('should should process valid upload requests', async() => {
            const fakeA = {oid: MISSING_KEY_1, size: 10};
            const fakeB = {oid: MISSING_KEY_2, size: 20};
            const given = requestWithBody({
                objects: [fakeA, fakeB]
            });

            await handler.handle(given.event, given.context, given.callback);

            expect.assertions(13);
            expect(callback).toHaveBeenCalledTimes(1);
            const actual = JSON.parse(callback.mock.calls[0][1].body);
            expect(actual.transfer).toBe(TRANSFER_TYPE);
            expect(actual.objects).toHaveLength(2);

            expect(actual.objects[0].oid).toBe(MISSING_KEY_1);
            expect(actual.objects[0].size).toBe(10);
            expect(actual.objects[0].actions.upload.href).toBe(uploadUrlFor(MISSING_KEY_1));
            expect(actual.objects[0].actions.upload.expires).toBeGreaterThan(0);
            expect(actual.objects[0].actions.verify.href).toMatch(VERIFY_URL_REGEX);

            expect(actual.objects[1].oid).toBe(MISSING_KEY_2);
            expect(actual.objects[1].size).toBe(20);
            expect(actual.objects[1].actions.upload.href).toBe(uploadUrlFor(MISSING_KEY_2));
            expect(actual.objects[1].actions.upload.expires).toBeGreaterThan(0);
            expect(actual.objects[1].actions.verify.href).toMatch(VERIFY_URL_REGEX);
        });

        it('should skip uploads for existing objects', async() => {
            const fakeA = {oid: EXISTING_KEY_1, size: EXISTING_KEY_SIZE};
            const fakeB = {oid: MISSING_KEY_2, size: 20};
            const given = requestWithBody({
                objects: [fakeA, fakeB]
            });

            await handler.handle(given.event, given.context, given.callback);

            expect.assertions(11);
            expect(callback).toHaveBeenCalledTimes(1);
            const actual = JSON.parse(callback.mock.calls[0][1].body);
            expect(actual.transfer).toBe(TRANSFER_TYPE);
            expect(actual.objects).toHaveLength(2);

            expect(actual.objects[0].oid).toBe(EXISTING_KEY_1);
            expect(actual.objects[0].size).toBe(EXISTING_KEY_SIZE);
            expect(actual.objects[0].actions).toBeUndefined();

            expect(actual.objects[1].oid).toBe(MISSING_KEY_2);
            expect(actual.objects[1].size).toBe(20);
            expect(actual.objects[1].actions.upload.href).toBe(uploadUrlFor(MISSING_KEY_2));
            expect(actual.objects[1].actions.upload.expires).toBeGreaterThan(0);
            expect(actual.objects[1].actions.verify.href).toMatch(VERIFY_URL_REGEX);
        });

        it('should wrap individual object errors', async() => {
            const fakeA = {oid: "boom", size: 1};
            const fakeB = {oid: MISSING_KEY_2, size: 20};
            const given = requestWithBody({
                objects: [fakeA, fakeB]
            });

            await handler.handle(given.event, given.context, given.callback);

            expect.assertions(12);
            expect(callback).toHaveBeenCalledTimes(1);
            const actual = JSON.parse(callback.mock.calls[0][1].body);
            expect(actual.transfer).toBe(TRANSFER_TYPE);

            expect(actual.objects[0].oid).toBe("boom");
            expect(actual.objects[0].size).toBe(1);
            expect(actual.objects[0].actions).toBeUndefined();
            expect(actual.objects[0].error.code).toBe(500);
            expect(actual.objects[0].error.message).toMatch(/Unhandled test exception/);

            expect(actual.objects[1].oid).toBe(MISSING_KEY_2);
            expect(actual.objects[1].size).toBe(20);
            expect(actual.objects[1].actions.upload.href).toBe(uploadUrlFor(MISSING_KEY_2));
            expect(actual.objects[1].actions.upload.expires).toBeGreaterThan(0);
            expect(actual.objects[1].actions.verify.href).toMatch(VERIFY_URL_REGEX);
        });
    });

    describe('downloads', () => {
        const downloadUrlFor = (key) => "DOWNLOAD_" + key;

        beforeAll(() => {
            Datastore.mockImplementation(() => {
                return {
                    exists: (key) => {
                        if(key === EXISTING_KEY_1) return startWith(true);
                        if(key === EXISTING_KEY_2) return startWith(true);
                        if(key === MISSING_KEY_1) return startWith(false);
                        if(key === MISSING_KEY_2) return startWith(false);
                        throw new Error("Unhandled test exception");
                    },
                    getDownloadUrl: (key) => {
                        if(key === EXISTING_KEY_1) return startWith(downloadUrlFor(key));
                        if(key === EXISTING_KEY_2) return startWith(downloadUrlFor(key));
                        if(key === MISSING_KEY_1) throw new Error("Should not be uploading this!");
                        if(key === MISSING_KEY_2) throw new Error("Should not be uploading this!");
                        throw new Error("Unhandled test exception");
                    }
                }
            });
        });

        beforeEach(() => {
            handler = new ObjectHandler("download", new Datastore(), INTEGRATION_ENDPOINT, "/test/resource/path");
        });

        afterAll(() => {
            Datastore.mockRestore();
        });

        it('should process valid download requests', async() => {
            const fakeA = {oid: EXISTING_KEY_1, size: 10};
            const fakeB = {oid: EXISTING_KEY_2, size: 20};
            const given = requestWithBody({
                objects: [fakeA, fakeB]
            });

            await handler.handle(given.event, given.context, given.callback);

            expect.assertions(11);
            expect(callback).toHaveBeenCalledTimes(1);
            const actual = JSON.parse(callback.mock.calls[0][1].body);
            expect(actual.transfer).toBe(TRANSFER_TYPE);
            expect(actual.objects).toHaveLength(2);

            expect(actual.objects[0].oid).toBe(EXISTING_KEY_1);
            expect(actual.objects[0].size).toBe(10);
            expect(actual.objects[0].actions.download.href).toBe(downloadUrlFor(EXISTING_KEY_1));
            expect(actual.objects[0].actions.download.expires).toBeGreaterThan(0);

            expect(actual.objects[1].oid).toBe(EXISTING_KEY_2);
            expect(actual.objects[1].size).toBe(20);
            expect(actual.objects[1].actions.download.href).toBe(downloadUrlFor(EXISTING_KEY_2));
            expect(actual.objects[1].actions.download.expires).toBeGreaterThan(0);
        });

        it('should give 404 for missing objects', async() => {
            const fakeA = {oid: MISSING_KEY_1, size: 10};
            const fakeB = {oid: EXISTING_KEY_1, size: 20};
            const given = requestWithBody({ objects: [fakeA, fakeB] });

            await handler.handle(given.event, given.context, given.callback);

            expect.assertions(12);
            expect(callback).toHaveBeenCalledTimes(1);
            const actual = JSON.parse(callback.mock.calls[0][1].body);
            expect(actual.actions).toBeUndefined();
            expect(actual.transfer).toBe(TRANSFER_TYPE);

            expect(actual.objects[0].oid).toBe(MISSING_KEY_1);
            expect(actual.objects[0].size).toBe(10);
            expect(actual.objects[0].actions).toBeUndefined();
            expect(actual.objects[0].error.code).toBe(404);
            expect(actual.objects[0].error.message).toBeDefined();

            expect(actual.objects[1].oid).toBe(EXISTING_KEY_1);
            expect(actual.objects[1].size).toBe(20);
            expect(actual.objects[1].actions.download.href).toBe(downloadUrlFor(EXISTING_KEY_1));
            expect(actual.objects[1].actions.download.expires).toBeGreaterThan(0);
        });

        it('should wrap other download errors', async() => {
            const fakeA = {oid: "boom", size: 10};
            const fakeB = {oid: EXISTING_KEY_1, size: 20};
            const given = requestWithBody({ objects: [fakeA, fakeB] });

            await handler.handle(given.event, given.context, given.callback);

            expect.assertions(12);
            expect(callback).toHaveBeenCalledTimes(1);
            const actual = JSON.parse(callback.mock.calls[0][1].body);
            expect(actual.actions).toBeUndefined();
            expect(actual.transfer).toBe(TRANSFER_TYPE);

            expect(actual.objects[0].oid).toBe("boom");
            expect(actual.objects[0].size).toBe(10);
            expect(actual.objects[0].actions).toBeUndefined();
            expect(actual.objects[0].error.code).toBe(500);
            expect(actual.objects[0].error.message).toBeDefined();

            expect(actual.objects[1].oid).toBe(EXISTING_KEY_1);
            expect(actual.objects[1].size).toBe(20);
            expect(actual.objects[1].actions.download.href).toBe(downloadUrlFor(EXISTING_KEY_1));
            expect(actual.objects[1].actions.download.expires).toBeGreaterThan(0);
        });
    });

    describe('Verify', () => {

        beforeAll(() => {
            Datastore.mockImplementation(() => {
                return {
                    exists: (key) => {
                        if(key === EXISTING_KEY_1) return startWith(true);
                        if(key === MISSING_KEY_1) return startWith(false);
                        throw new Error("Unhandled test exception: exist");
                    },
                    getInfo: (key) => {
                        if(key === EXISTING_KEY_1) return startWith({ContentLength: EXISTING_KEY_SIZE});
                        if(key === MISSING_KEY_1) return startWith(null);
                        throw new Error("Unhandled test exception: verify");
                    }
                }
            });
        });

        beforeEach(() => {
            handler = new ObjectHandler("verify", new Datastore(), INTEGRATION_ENDPOINT, "/test/resource/path");
        });

        afterAll(() => {
            Datastore.mockRestore();
        });

        it('Should verify correct object', async() => {
            const body = {oid: EXISTING_KEY_1, size: EXISTING_KEY_SIZE};
            const given = requestWithBody(body);

            await handler.handle(given.event, given.context, given.callback);

            expect.assertions(2);
            expect(callback).toHaveBeenCalledTimes(1);
            expect(JSON.parse(callback.mock.calls[0][1].body)).toEqual(body);
        });

        it('Should not verify incorrect object', async() => {
            const given = requestWithBody({oid: EXISTING_KEY_1, size: 12});

            await handler.handle(given.event, given.context, given.callback);

            expect.assertions(3);
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback.mock.calls[0][0].statusCode).toBe(411);
            expect(JSON.parse(callback.mock.calls[0][0].body).message).toBeDefined();
        });

        it('Should not verify missing object', async() => {
            const given = requestWithBody({oid: MISSING_KEY_1, size: EXISTING_KEY_SIZE});

            await handler.handle(given.event, given.context, given.callback);

            expect.assertions(3);
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback.mock.calls[0][0].statusCode).toBe(404);
            expect(JSON.parse(callback.mock.calls[0][0].body).message).toBeDefined();
        });

        it('Should wrap other errors', async() => {
            const given = requestWithBody({oid: "boom", size: EXISTING_KEY_SIZE});

            await handler.handle(given.event, given.context, given.callback);

            expect.assertions(3);
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback.mock.calls[0][0].statusCode).toBe(500);
            expect(JSON.parse(callback.mock.calls[0][0].body).message).toBeDefined();
        });
    });
});
