jest.mock('../common/Datastore'); //has to be first or wallaby will blow up.

const BatchProcessor = require('../BatchProcessor');
const Datastore = require('../common/Datastore');

const TRANSFER_TYPE = "TEST_TRANSFER_TYPE";
const K = require('kpromise');
const failWith = K.failWith;

const MISSING = "missingKey";
const uploadUrlFor = (key) => "UPLOAD_" + key;
const downloadUrlFor = (key) => "DOWNLOAD_" + key;

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
                        if(key === MISSING) return failWith(key);
                        return key;
                    },
                    doesNotExist: (key) => {
                        if(key !== MISSING) return failWith(key);
                        return key;
                    },
                    getDownloadUrl: (key) => {
                        return failWith(key + " should not get here!");
                    },
                    getUploadUrl: (key) => {
                        if(key === MISSING) return failWith(key + " should not be here!");
                        return uploadUrlFor(key);
                    },
                }
            });
        });


        it('Should process an upload request.', async() => {
            const given = [{oid: "testoid", size: 5}];

            let actual = await processor.processUpload(given);
            console.log(actual);

            expect.assertions(2);
            expect(actual.objects).toHaveLength(1);
            expect(actual.objects[0].actions.upload.href).toBe("UPLOAD_testoid");
        });

        it('Should process multiple upload requests.', async() => {
            const given = [
                {oid: "testoid1", size: 5},
                {oid: "testoid2", size: 5},
            ];

            let actual = await processor.processUpload(given);
            console.log(actual);

            expect.assertions(3);
            expect(actual.objects).toHaveLength(2);
            expect(actual.objects[0].actions.upload.href).toBe(uploadUrlFor("testoid1"));
            expect(actual.objects[1].actions.upload.href).toBe(uploadUrlFor("testoid2"));
        });

    });

    describe('Downloads', () => {

        beforeAll(() => {
            Datastore.mockImplementation(() => {
                return {
                    exists: (key) => {
                        if(key === MISSING) return failWith(key);
                        return key;
                    },
                    doesNotExist: (key) => {
                        if(key !== MISSING) return failWith(key);
                        return key;
                    },
                    getDownloadUrl: (key) => {
                        if(key === MISSING) return failWith(key + " should not be here!");
                        return downloadUrlFor(key);
                    },
                    getUploadUrl: (key) => {
                        return failWith(key + " should not get here!");
                    },
                }
            });
        });


        it('Should process a download request.', async() => {
            const given = [{oid: "testoid", size: 5}];

            const actual = await processor.processDownload(given);
            console.log(actual.objects[0]);

            expect.assertions(2);
            expect(actual.objects).toHaveLength(1);
            expect(actual.objects[0].actions.download.href).toBe("DOWNLOAD_testoid");
        });

        it('Should process multiple download requests.', async() => {
            const given = [
                {oid: "testoid1", size: 5},
                {oid: "testoid2", size: 10}
            ];

            const actual = await processor.processDownload(given);
            console.log(actual.objects[0].actions);

            expect.assertions(3);
            expect(actual.objects).toHaveLength(2);
            expect(actual.objects[0].actions.download.href).toBe("DOWNLOAD_testoid1");
            expect(actual.objects[1].actions.download.href).toBe("DOWNLOAD_testoid2");
        });

        it('Should give 404 on downloading missing objects', async() => {
            const given = [
                {oid: MISSING, size: 5},
                {oid: "notMissing", size: 5}
            ];

            const actual = await processor.processDownload(given);

            expect.assertions(8);
            expect(actual.objects).toHaveLength(2);
            expect(actual.objects[0].oid).toBe(MISSING);
            expect(actual.objects[0].size).toBe(5);
            expect(actual.objects[0].actions).toBeUndefined();
            expect(actual.objects[0].error.code).toBe(404);
            expect(actual.objects[1].oid).toBe("notMissing");
            expect(actual.objects[1].size).toBe(5);
            expect(actual.objects[1].actions.download.href).toBe(downloadUrlFor("notMissing"));
        });
    });
});