const AWS = require('aws-sdk-mock');

describe('GLL API', () => {

    const callback = jest.fn();

    afterEach(() => {
        callback.mockReset();
    });

    afterAll(() => {
        AWS.restore();
    });

    describe('batch', () => {

        const MISSING_KEY = "missingKey";
        const EXISTING_KEY = "existingKey";
        const INTEGRATION_BUCKET = "gllApiIntegrationTestBucket";

        function makeUrl(operation, bucket, key) {
            return `${operation}:${bucket}/${key}`;
        }


        beforeAll(() => {
            process.env.GLL_ARTIFACTS_BUCKET = INTEGRATION_BUCKET;

            AWS.mock('S3', 'getSignedUrl', (operation, params, callback) => {
                console.log("here?");
                if(operation === 'putObject' && params.Key === MISSING_KEY) {
                    return callback(null, makeUrl(operation, params.Bucket, params.Key));
                }

                if(operation === 'getObject' && params.Key === EXISTING_KEY) {
                    return callback(null, makeUrl(operation, params.Bucket, params.Key));
                }

                return callback("FakeError");
            });

            AWS.mock('S3', 'headObject', (params, callback) => {
                if(params.Key === EXISTING_KEY) return callback(null, {});

                if(params.Key === MISSING_KEY) return callback({
                        code: "NotFound",
                        message: "Mock s3: no such key " + params.Key
                    }
                );

                return callback("FakeError");
            });
        });

        let batch = null;
        beforeEach(() => {
            batch = require('../src/batch');
        });

        afterAll(() => {
            AWS.restore();
        });

        it('will respond empty to empty', async() => {
            const given = {
                event: {
                    body: "{}"
                },
                context: {
                    awsRequestId: "testRequestId"
                }
            };

            await batch.handler(given.event, given.context, callback);

            expect.assertions(4);
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback.mock.calls[0][0]).toBeNull();
            expect(callback.mock.calls[0][1].statusCode).toBe(200);

            const response = JSON.parse(callback.mock.calls[0][1].body);
            expect(response.objects).toHaveLength(0);
        });

        it('will provide upload url for new objects', async() => {
            const given = {
                event: {
                    body: JSON.stringify({
                        operation: 'upload',
                        objects: [{oid: 123, size: 25}]
                    })
                },
                context: {
                    awsRequestId: "testRequestId"
                }
            };

            await batch.handler(given.event, given.context, callback);

            expect.assertions(4);
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback.mock.calls[0][0]).toBeNull();
            expect(callback.mock.calls[0][1].statusCode).toBe(200);

            const response = JSON.parse(callback.mock.calls[0][1].body);
            expect(response.objects).toHaveLength(1);
            console.log(response.objects[0]);
            expect(response.objects[0].actions.upload.href).toBe(makeUrl('putObject', INTEGRATION_BUCKET, 123))
        });

    });

    describe('verifyLocks', () => {

        let handler = null;
        beforeEach(() => {
            handler = require('../src/verifyLocks');
        });

        it('will respond empty', async() => {
            const given = {
                event: {
                    body: "{}"
                },
                context: {
                    awsRequestId: "testRequestId"
                }
            };

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

        it('is not implemented', async() => {
            const given = {
                event: {
                    body: "{}"
                },
                context: {
                    awsRequestId: "testRequestId"
                }
            };

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

        it('is not implemented', async() => {
            const given = {
                event: {
                    body: "{}"
                },
                context: {
                    awsRequestId: "testRequestId"
                }
            };

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

    describe('deleteLocks', () => {

        let handler = null;
        beforeEach(() => {
            handler = require('../src/listLocks');
        });

        it('is not implemented', async() => {
            const given = {
                event: {
                    body: "{}"
                },
                context: {
                    awsRequestId: "testRequestId"
                }
            };

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