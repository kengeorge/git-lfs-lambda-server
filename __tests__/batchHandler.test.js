const BatchProcessor = require('../BatchProcessor');
const Datastore = require('../common/Datastore');

const TRANSFER_TYPE = "TEST_TRANSFER_TYPE";

jest.mock('../common/Datastore');

describe('BatchProcessor', () => {

    beforeEach(() => {
        Datastore.mockClear();
    });

    beforeAll(() => {
        Datastore.mockImplementation(() => {
            return {
                getUploadUrl: (key) => {
                    return "UPLOAD_" + key;
                },
                getDownloadUrl: (key) => {
                    return "DOWNLOAD_" + key
                }
            };
        });
    });

    it('Should process an upload request.', async() => {
        const given = [{oid: "testoid", size: 5}];

        const processor = new BatchProcessor(new Datastore(), TRANSFER_TYPE);

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

        const processor = new BatchProcessor(new Datastore(), TRANSFER_TYPE);

        let actual = await processor.processUpload(given);

        expect.assertions(3);
        expect(actual.objects).toHaveLength(2);
        expect(actual.objects[0].actions.upload.href).toBe("UPLOAD_testoid1");
        expect(actual.objects[1].actions.upload.href).toBe("UPLOAD_testoid2");
    });

    it('Should process a download request.', async() => {
        const given = [{oid: "testoid", size: 5}];

        const processor = new BatchProcessor(new Datastore(), TRANSFER_TYPE);

        let actual = await processor.processDownload(given);

        expect.assertions(2);
        expect(actual.objects).toHaveLength(1);
        expect(actual.objects[0].actions.download.href).toBe("DOWNLOAD_testoid");
    });

    it('Should process multiple download requests.', async() => {
        const given = [
            {oid: "testoid1", size: 5},
            {oid: "testoid2", size: 10}
        ];

        const processor = new BatchProcessor(new Datastore(), TRANSFER_TYPE);

        let actual = await processor.processDownload(given);

        expect.assertions(3);
        expect(actual.objects).toHaveLength(2);
        expect(actual.objects[0].actions.download.href).toBe("DOWNLOAD_testoid1");
        expect(actual.objects[1].actions.download.href).toBe("DOWNLOAD_testoid2");
    });

});