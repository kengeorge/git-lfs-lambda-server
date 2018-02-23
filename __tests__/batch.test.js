jest.mock('../src/BatchProcessor'); //has to be first or wallaby will blow up.

const Processor = require('../src/BatchProcessor');

describe('Batch handler', () => {

    const callback = jest.fn();
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

    const fakeObject = (id, size) => {
        return {oid: id, size: size}
    };

    const givenCall = (body) => {
        return {
            event: {
                body: JSON.stringify(body)
            },
            context: {
                awsRequestId: "testRequestId"
            }
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
        handler = require('../src/batch').handler;
    });

    afterEach(() => {
        Processor.mockClear();
        callback.mockClear();
        mockUpload.mockClear();
        mockDownload.mockClear();
    });

    //TODO these are somewhat brittle, but want to make sure they're covered for now regardless.
    it('Should refuse unknown transfer type', async() => {
        const given = givenCall({
            operation: "upload",
            transfers: ["somethingWeird"],
            objects: [fakeObject("abc", 10)]
        });

        await handler(given.event, given.context, callback);

        expect.assertions(6);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback.mock.calls[0][1]).toBeNull();
        expect(callback.mock.calls[0][0].statusCode).toBe(422);

        const response = JSON.parse(callback.mock.calls[0][0].body);
        expect(response.message).toMatch(/somethingWeird/);
        expect(response.documentation_url).toBeDefined();
        expect(response.request_id).toBe("testRequestId");
    });

    it('Should respond to valid upload requests', async() => {
        const fakeA = fakeObject("1", 10);
        const fakeB = fakeObject("2", 20)
        const given = givenCall({
            operation: "upload",
            objects: [fakeA, fakeB]
        });

        mockDownload.mockImplementation(() => {
            throw new Error("Should not be calling download here.");
        });

        mockUpload.mockImplementation(fakeUpload);


        await handler(given.event, given.context, callback);

        expect.assertions(7);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback.mock.calls[0][0]).toBeNull();

        expect(callback.mock.calls[0][1].statusCode).toBe(200);
        const response = JSON.parse(callback.mock.calls[0][1].body);
        expect(response.transfer).toBe('basic');
        expect(response.objects).toHaveLength(2)
        expect(response.objects[0]).toEqual(fakeUpload(fakeA));
        expect(response.objects[1]).toEqual(fakeUpload(fakeB));
    });

    it('Should respond to valid download requests', async() => {
        const fakeA = fakeObject("1", 10);
        const fakeB = fakeObject("2", 20);
        const given = givenCall({
            operation: "download",
            objects: [fakeA, fakeB]
        });

        mockUpload.mockImplementation(() => {
            throw new Error("Should not be calling upload here.");
        });

        mockDownload.mockImplementation(fakeDownload);

        await handler(given.event, given.context, callback);

        expect.assertions(7);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback.mock.calls[0][0]).toBeNull();

        expect(callback.mock.calls[0][1].statusCode).toBe(200);
        const response = JSON.parse(callback.mock.calls[0][1].body);
        expect(response.transfer).toBe('basic');
        expect(response.objects).toHaveLength(2)
        expect(response.objects[0]).toEqual(fakeDownload(fakeA));
        expect(response.objects[1]).toEqual(fakeDownload(fakeB));
    });

    it('Should wrap errors', async() => {
        const given = givenCall({
            operation: "upload",
            objects: [fakeObject("abc", 10)]
        });

        mockUpload.mockImplementation(() => {
            throw new Error("boom");
        });

        await handler(given.event, given.context, callback);

        expect.assertions(6);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback.mock.calls[0][0].statusCode).toBe(500);

        const response = JSON.parse(callback.mock.calls[0][0].body);
        expect(response.message).toMatch(/boom/);
        expect(response.documentation_url).toBeDefined();
        expect(response.request_id).toBe("testRequestId");

        expect(callback.mock.calls[0][1]).toBeNull();
    });

});
