jest.mock('../src/common/Locks')

const LockHandler = require('../src/common/LockHandler');
const Locks = require('../src/common/Locks');

describe('LockHandler', () => {

    const testVerifyFunc = jest.fn();
    let handler = null;

    beforeAll(() => {
        Locks.mockImplementation(() => {
            return {
                verify: testVerifyFunc
            };
        });
    });

    describe('Verify', () => {

        beforeEach(() => {
            handler = new LockHandler('verify');
        });

        afterEach(() => {
            testVerifyFunc.mockReset();
        });

        it('Should process', async() => {
            testVerifyFunc.mockReturnValueOnce("expected");

            const actual = await handler.process({test: "data"})

            expect.assertions(1);
            expect(actual).toBe("expected");
        });

        it('Should provide error doc.', async() => {
            expect.assertions(1);
            expect(handler.getDocUrl(500)).toMatch(/^https/);
        });
    });
});