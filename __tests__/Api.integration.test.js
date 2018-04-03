/**
 * Integration tests (from lambda func up to AWS) representing the current implementation progress of the API.
 */

describe('GLL API', () => {

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
            }
        };
    };

    afterEach(() => {
        callback.mockReset();
    });

    afterAll(() => {
        jest.resetModules();
    });

    describe('batch', () => {

        const MISSING_KEY = "missingKey";
        const EXISTING_KEY = "existingKey";
        const INTEGRATION_BUCKET = "gllApiIntegrationTestBucket";
        const INTEGRATION_ENDPOINT = "gllApiIntegrationTestEndpoint";
        const VERIFY_URL_REGEX = new RegExp(`^https?://${INTEGRATION_ENDPOINT}/.*/verify$`);

        function makeUrl(operation, bucket, key) {
            return `${operation}:${bucket}/${key}`;
        }


        beforeAll(() => {
            process.env.GLL_ARTIFACTS_BUCKET = INTEGRATION_BUCKET;
            process.env.GLL_ENDPOINT = INTEGRATION_ENDPOINT;

            const mockS3 = jest.fn(() => ({
                headObject: (params) => {
                    return {
                        promise: () => {
                            if(params.Key === EXISTING_KEY) return Promise.resolve({});

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

        let batch = null;
        beforeEach(() => {
            batch = require('../src/batch');
        });

        afterAll(() => {
            jest.resetModules();
        });

        it('will provide upload url for new objects and skip exisitng', async() => {
            const given = requestWithBody({
                operation: "upload",
                objects: [
                    {oid: MISSING_KEY, size: 25},
                    {oid: EXISTING_KEY, size: 25}
                ]
            });

            await batch.handler(given.event, given.context, callback);

            expect.assertions(7);
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback.mock.calls[0][0]).toBeNull();
            expect(callback.mock.calls[0][1].statusCode).toBe(200);

            const response = JSON.parse(callback.mock.calls[0][1].body);
            expect(response.objects).toHaveLength(2);
            expect(response.objects[0].actions.upload.href)
                .toBe(makeUrl('putObject', INTEGRATION_BUCKET, MISSING_KEY))
            expect(response.objects[0].actions.verify.href).toMatch(VERIFY_URL_REGEX);

            expect(response.objects[1].actions).toBeUndefined();
        });

        it('will provide download url for existing objects and error for missing', async() => {
            const given = requestWithBody({
                operation: "download",
                objects: [
                    {oid: MISSING_KEY, size: 25},
                    {oid: EXISTING_KEY, size: 25}
                ]
            });

            await batch.handler(given.event, given.context, callback);

            expect.assertions(8);
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback.mock.calls[0][0]).toBeNull();
            expect(callback.mock.calls[0][1].statusCode).toBe(200);

            const response = JSON.parse(callback.mock.calls[0][1].body);
            expect(response.objects).toHaveLength(2);
            expect(response.objects[0].actions).toBeUndefined();
            expect(response.objects[0].error.code).toBe(404);
            expect(response.objects[0].error.message).toBeDefined();
            expect(response.objects[1].actions.download.href)
                .toBe(makeUrl('getObject', INTEGRATION_BUCKET, EXISTING_KEY))
        });

        it('will wrap individual file errors', async() => {
            const given = requestWithBody({
                operation: "download",
                objects: [
                    {oid: EXISTING_KEY, size: 25},
                    {oid: "boom", size: 25}
                ]
            });

            await batch.handler(given.event, given.context, callback);

            expect.assertions(7);
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback.mock.calls[0][0]).toBeNull();
            expect(callback.mock.calls[0][1].statusCode).toBe(200);

            const response = JSON.parse(callback.mock.calls[0][1].body);
            expect(response.objects).toHaveLength(2);
            expect(response.objects[0].actions.download.href)
                .toBe(makeUrl('getObject', INTEGRATION_BUCKET, EXISTING_KEY));
            expect(response.objects[1].error.message).toBeDefined();
            expect(response.objects[1].error.code).toBe(500);
        });

    });

    describe('verifyObject', () => {

        const MISSING_KEY = "missingKey";
        const EXISTING_KEY = "existingKey";
        const EXISTING_KEY_SIZE = 128;
        const INTEGRATION_BUCKET = "gllApiIntegrationTestBucket";

        function makeUrl(operation, bucket, key) {
            return `${operation}:${bucket}/${key}`;
        }


        beforeAll(() => {
            process.env.GLL_ARTIFACTS_BUCKET = INTEGRATION_BUCKET;

            const mockS3 = jest.fn(() => ({
                headObject: (params) => {
                    return {
                        promise: () => {
                            if(params.Key === EXISTING_KEY) return Promise.resolve({
                                ContentLength: EXISTING_KEY_SIZE
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

        let batch = null;
        beforeEach(() => {
            batch = require('../src/verifyObject');
        });

        afterAll(() => {
            jest.resetModules();
        });

        it('will verify existing objects', async() => {
            const given = requestWithBody({
                oid: EXISTING_KEY, size: EXISTING_KEY_SIZE
            });

            await batch.handler(given.event, given.context, callback);

            expect.assertions(3);
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback.mock.calls[0][0]).toBeNull();
            expect(callback.mock.calls[0][1].statusCode).toBe(200);
        });

        it('will not verify missing objects', async() => {
            const given = requestWithBody({
                oid: MISSING_KEY, size: 1
            });

            await batch.handler(given.event, given.context, callback);

            expect.assertions(6);
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback.mock.calls[0][0].statusCode).toBe(404);
            const response = JSON.parse(callback.mock.calls[0][0].body);
            expect(response.message).toBeDefined();
            expect(response.documentation_url).toBeDefined();
            expect(response.request_id).toBe("testRequestId");
            expect(callback.mock.calls[0][1]).toBeUndefined();
        });

        it('will not verify objects with mismatched sizes', async() => {
            const given = requestWithBody({
                oid: EXISTING_KEY, size: 12
            });

            await batch.handler(given.event, given.context, callback);

            expect.assertions(6);
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback.mock.calls[0][0].statusCode).toBe(411);
            const response = JSON.parse(callback.mock.calls[0][0].body);
            expect(response.message).toBeDefined();
            expect(response.documentation_url).toBeDefined();
            expect(response.request_id).toBe("testRequestId");
            expect(callback.mock.calls[0][1]).toBeUndefined();
        });

        it('will fail gracefully', async() => {
            const given = requestWithBody({
                oid: "splode", size: 12
            });

            await batch.handler(given.event, given.context, callback);

            expect.assertions(6);
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback.mock.calls[0][0].statusCode).toBe(500);
            const response = JSON.parse(callback.mock.calls[0][0].body);
            expect(response.message).toBeDefined();
            expect(response.documentation_url).toBeDefined();
            expect(response.request_id).toBe("testRequestId");
            expect(callback.mock.calls[0][1]).toBeUndefined();
        });
    });

    describe('verifyLocks', () => {

        let handler = null;
        beforeEach(() => {
            handler = require('../src/verifyLocks');
        });

        it('will respond empty', async() => {
            const given = requestWithBody("");

            await handler.handler(given.event, given.context, callback);

            expect.assertions(5);
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback.mock.calls[0][0]).toBeNull();
            expect(callback.mock.calls[0][1].statusCode).toBe(200);

            const response = JSON.parse(callback.mock.calls[0][1].body);
            expect(response.ours).toHaveLength(0);
            expect(response.theirs).toHaveLength(0);
        });

    });

    describe('listLocks', () => {

        let handler = null;
        beforeEach(() => {
            handler = require('../src/listLocks');
        });

        it.skip('is not implemented', async() => {
            const given = requestWithBody({});

            await handler.handler(given.event, given.context, callback);

            expect.assertions(6);
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback.mock.calls[0][0].statusCode).toBe(501);

            const response = JSON.parse(callback.mock.calls[0][0].body);
            expect(response.message).toMatch(/not implemented/)
            expect(response.request_id).toBe("testRequestId")
            expect(response).toHaveProperty('documentation_url');

            expect(callback.mock.calls[0][1]).toBeNull();
        });
    });

    describe('createLock', () => {

        let handler = null;
        beforeEach(() => {
            handler = require('../src/createLock');
        });

        it.skip('is not implemented', async() => {
            const given = requestWithBody({});

            await handler.handler(given.event, given.context, callback);

            expect.assertions(6);
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback.mock.calls[0][0].statusCode).toBe(501);

            const response = JSON.parse(callback.mock.calls[0][0].body);
            expect(response.message).toMatch(/not implemented/)
            expect(response.request_id).toBe("testRequestId")
            expect(response).toHaveProperty('documentation_url');

            expect(callback.mock.calls[0][1]).toBeNull();
        });
    });

    describe('deleteLock', () => {

        let handler = null;
        beforeEach(() => {
            handler = require('../src/deleteLock');
        });

        it.skip('is not implemented', async() => {
            const given = requestWithBody({});

            await handler.handler(given.event, given.context, callback);

            expect.assertions(6);
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback.mock.calls[0][0].statusCode).toBe(501);

            const response = JSON.parse(callback.mock.calls[0][0].body);
            expect(response.message).toMatch(/not implemented/)
            expect(response.request_id).toBe("testRequestId")
            expect(response).toHaveProperty('documentation_url');

            expect(callback.mock.calls[0][1]).toBeNull();
        });
    });

});
