const ObjectHandler = require('../src/common/ObjectHandler');
const startWith = require('kpromise').startWith;

describe('Object handler', () => {

    const processor = {
        processUpload: jest.fn(),
        processDownload: jest.fn(),
        verify: jest.fn(),
    };

    afterEach(() => {
        processor.processUpload.mockClear();
        processor.processDownload.mockClear();
        processor.verify.mockClear();
    });


    describe('batch', () => {


        const fakeUpload = (o) => {
            return {
                oid: o.oid,
                size: o.size,
                actions: "uploadThings"
            };
        };

        const fakeDownload = (o) => {
            return {
                oid: o.oid,
                size: o.size,
                actions: "downloadThings"
            };
        };

        let handler = null;
        beforeEach(() => {
            handler = new ObjectHandler("batch", processor);
        });

        it('should refuse unknown transfer type', async() => {
            expect.assertions(3);
            await startWith({transfers: ["somethingWeird"]})
                .then(handler.process)
                .catch((e) => {
                    expect(e.statusCode).toBe(422)
                    expect(e.message).toMatch(/transfer type/);
                    expect(e.message).toMatch(/somethingWeird/);
                });
        });

        it('should process upload requests', async() => {
            const fakeA = {oid: 1, size: 10};
            const fakeB = {oid: 2, size: 20};
            const given = {
                operation: "upload",
                objects: [fakeA, fakeB]
            };

            processor.processDownload.mockImplementation(() => {
                throw new Error("Should not be calling download here.");
            });

            processor.processUpload.mockImplementation(fakeUpload);

            const actual = await handler.process(given);

            expect.assertions(4);
            expect(actual.transfer).toBe('basic');
            expect(actual.objects).toHaveLength(2)
            expect(actual.objects[0]).toEqual(fakeUpload(fakeA));
            expect(actual.objects[1]).toEqual(fakeUpload(fakeB));
        });

        it('should process download requests', async() => {
            const fakeA = {oid: 1, size: 10};
            const fakeB = {oid: 2, size: 20};
            const given = {
                operation: "download",
                objects: [fakeA, fakeB]
            };

            processor.processUpload.mockImplementation(() => {
                throw new Error("Should not be calling upload here.");
            });

            processor.processDownload.mockImplementation(fakeDownload);

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

    describe('verification', () => {

        const EXISTING_KEY = "existingKey";
        const EXISTING_KEY_SIZE = 256;

        let handler = null;
        beforeEach(() => {
            handler = new ObjectHandler("verify", processor);
        });

        beforeAll(() => {
            processor.verify.mockImplementation((requestObj) => {
                if(requestObj.oid !== EXISTING_KEY) return {
                    result: "NotFound",
                    requested: requestObj,
                    found: null
                };

                return {
                    result: requestObj.size === EXISTING_KEY_SIZE ? "Verified" : "WrongSize",
                    requested: requestObj,
                    found: {oid: EXISTING_KEY, size: EXISTING_KEY_SIZE}
                };
            });
        });

        it('should verify existing objects', async() => {
            const given = {oid: EXISTING_KEY, size: EXISTING_KEY_SIZE};

            const actual = await handler.process(given);

            expect.assertions(1);
            expect(actual).toEqual(given);

        });

        it('should fail for missing objects', async() => {

            expect.assertions(2);
            await startWith({oid: "missing", size: 1})
                .then(handler.process)
                .catch((e) => {
                    expect(e.statusCode).toBe(404);
                    expect(e.message).toBeDefined();
                });
        });

        it('should fail for incorrect objects', async() => {

            expect.assertions(2)
            await startWith({oid: EXISTING_KEY, size: EXISTING_KEY_SIZE - 1})
                .then(handler.process)
                .catch((e) => {
                    expect(e.statusCode).toBe(411);
                    expect(e.message).toBeDefined();
                });
        });

    });
});
