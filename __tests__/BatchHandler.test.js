jest.mock('../src/BatchProcessor'); //has to be first or wallaby will blow up.

const Processor = require('../src/BatchProcessor');
const BatchHandler = require('../src/BatchHandler');
const startWith = require('kpromise').startWith;

describe('Batch handler', () => {

    const mockUpload = jest.fn();
    const mockDownload = jest.fn();

    const fakeUpload = (o) => {
        return {
            oid: o.oid,
            size: o.size,
            actions: "upload"
        };
    };

    const fakeDownload = (o) => {
        return {
            oid: o.oid,
            size: o.size,
            actions: "download"
        };
    };

    beforeAll(() => {
        Processor.mockImplementation(() => {
            return {
                getUploadDirective: mockUpload,
                getDownloadDirective: mockDownload
            }
        });
    });

    let handler = null;
    beforeEach(() => {
        handler = new BatchHandler("testBucketName");
    });

    afterEach(() => {
        Processor.mockClear();
        mockUpload.mockClear();
        mockDownload.mockClear();
    });

    it('Should refuse unknown transfer type', async() => {
        expect.assertions(2);

        await startWith({transfers: ["somethingWeird"]})
            .then(handler.process)
            .catch((e) => {
                expect(e.statusCode).toBe(422)
                expect(e.message).toMatch(/Unsupported transfer type/);
            });
    });

    it('Should process upload requests', async() => {
        const fakeA = {oid: 1, size: 10};
        const fakeB = {oid: 2, size: 20};
        const given = {
            operation: "upload",
            objects: [fakeA, fakeB]
        };

        mockDownload.mockImplementation(() => {
            throw new Error("Should not be calling download here.");
        });

        mockUpload.mockImplementation(fakeUpload);


        const actual = await handler.process(given);

        expect.assertions(4);
        expect(actual.transfer).toBe('basic');
        expect(actual.objects).toHaveLength(2)
        expect(actual.objects[0]).toEqual(fakeUpload(fakeA));
        expect(actual.objects[1]).toEqual(fakeUpload(fakeB));
    });

    it('Should process requests', async() => {
        const fakeA = {oid: 1, size: 10};
        const fakeB = {oid: 2, size: 20};
        const given = {
            operation: "download",
            objects: [fakeA, fakeB]
        };

        mockUpload.mockImplementation(() => {
            throw new Error("Should not be calling upload here.");
        });

        mockDownload.mockImplementation(fakeDownload);

        const actual = await handler.process(given);

        expect.assertions(4);
        expect(actual.transfer).toBe('basic');
        expect(actual.objects).toHaveLength(2)
        expect(actual.objects[0]).toEqual(fakeDownload(fakeA));
        expect(actual.objects[1]).toEqual(fakeDownload(fakeB));
    });

    it('Should provide documentation url', () => {
        expect(handler.getDocUrl(500)).toMatch(/^https/);
    });

});
