const Handler = require('../src/common/Handler');

describe('Handler', () => {

    const givenEvent = {
        body: '{ "test": "data" }'
    };

    const givenContext = {
        awsRequestId: "testRequestId"
    };

    const testProcessFunc = jest.fn();
    const callback = jest.fn();
    let handler = null;

    beforeEach(() => {
        handler = new Handler();
        handler.process = testProcessFunc;
        handler.getDocUrl = (code) => `doc for ${code}`;
    });

    afterEach(() => {
        callback.mockReset();
        testProcessFunc.mockReset();
    });

    it('Should process valid request.', async() => {
        testProcessFunc.mockReturnValueOnce("expected");

        await handler.handle(givenEvent, givenContext, callback);

        expect.assertions(5);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback.mock.calls[0][0]).toBeNull();

        expect(callback.mock.calls[0][1].statusCode).toBe(200);
        expect(callback.mock.calls[0][1].body).toBeDefined();
        const response = JSON.parse(callback.mock.calls[0][1].body);
        expect(response).toBe("expected");
    });

    it('Should wrap known errors.', async() => {

        testProcessFunc.mockImplementation(() => {
            throw {statusCode: 111, message: "testErr"}
        });

        await handler.handle(givenEvent, givenContext, callback);

        expect.assertions(7);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback.mock.calls[0][1]).toBeUndefined();

        expect(callback.mock.calls[0][0].statusCode).toBe(111);
        expect(callback.mock.calls[0][0].body).toBeDefined();
        const response = JSON.parse(callback.mock.calls[0][0].body);
        expect(response.message).toBe("testErr");
        expect(response.documentation_url).toBe("doc for 111");
        expect(response.request_id).toBe("testRequestId");
    });
    it('Should 500 unknown errors.', async() => {

        testProcessFunc.mockImplementation(() => {
            throw new Error("Boom")
        });

        await handler.handle(givenEvent, givenContext, callback);

        expect.assertions(7);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback.mock.calls[0][1]).toBeUndefined();

        expect(callback.mock.calls[0][0].statusCode).toBe(500);
        expect(callback.mock.calls[0][0].body).toBeDefined();
        const response = JSON.parse(callback.mock.calls[0][0].body);
        expect(response.message).toBe("Boom");
        expect(response.documentation_url).toBe("doc for 500");
        expect(response.request_id).toBe("testRequestId");
    });
});
