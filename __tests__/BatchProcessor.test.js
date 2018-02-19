jest.mock('../common/Datastore'); //has to be first or wallaby will blow up.

const BatchProcessor = require('../BatchProcessor');
const Datastore = require('../common/Datastore');

const TRANSFER_TYPE = "TEST_TRANSFER_TYPE";
const K = require('kpromise');
const valueFor = K.startWith;
const failWith = K.failWith;


describe('BatchProcessor', () => {

    let processor = null;
    beforeEach(() => {
        processor = new BatchProcessor(new Datastore(), TRANSFER_TYPE);
        Datastore.mockClear();
    });

    describe('Uploads', () => {

        describe('Successful responses', () => {

            beforeAll(() => {
                Datastore.mockImplementation(() => {
                    return {
                        getUploadUrl: (key) => {
                            return valueFor("UPLOAD_" + key);
                        },
                    };
                });
            });

            beforeEach(() => {
                processor = new BatchProcessor(new Datastore(), TRANSFER_TYPE);
                Datastore.mockClear();
            });

            it('Should process an upload request.', async() => {
                const given = [{oid: "testoid", size: 5}];

                let actual = await processor.processUpload(given);

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

                expect.assertions(3);
                expect(actual.objects).toHaveLength(2);
                expect(actual.objects[0].actions.upload.href).toBe("UPLOAD_testoid1");
                expect(actual.objects[1].actions.upload.href).toBe("UPLOAD_testoid2");
            });
        });

    });

    describe('Downloads', () => {


        describe('Successful responses', () => {

            beforeAll(() => {
                Datastore.mockImplementation(() => {
                    return {
                        getDownloadUrl: (key) => {
                            return "DOWNLOAD_" + key
                        }
                    };
                });
            });


            it('Should process a download request.', async() => {
                const given = [{oid: "testoid", size: 5}];

                const actual = await processor.processDownload(given);

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

                expect.assertions(3);
                expect(actual.objects).toHaveLength(2);
                expect(actual.objects[0].actions.download.href).toBe("DOWNLOAD_testoid1");
                expect(actual.objects[1].actions.download.href).toBe("DOWNLOAD_testoid2");
            });
        });

        describe('Error responses', () => {
            beforeAll(() => {
                Datastore.mockImplementation(() => {
                    return {
                        exists: (key) => {
                            return failWith(`error: ${key}`);
                        },

                        getDownloadUrl: (key) => {
                            //TODO
                        },
                    }
                });
            });

            it('Should give 404 on missing objects', async() => {
                const given = [
                    {oid: "missing", size: 5}
                ];

                const actual = await processor.processDownload(given);

                expect.assertions(4);
                expect(actual.objects).toHaveLength(1);
                expect(actual.objects[0].actions).toBeUndefined();
                expect(actual.objects.error.code).toBe(404);
                expect(actual.object.error.message).toBe("something");
            });
        });
    });

});