const Locks = require('../common/Locks');

describe('VerifyLocksProcessor', () => {

    let locks = null;
    beforeEach(() => {
        locks = new Locks();
    });

    it('Should return empty lock list when there are no locks.', async() => {
        expect.assertions(1);
        await expect(locks.list()).resolves.toEqual({
            locks: []
        });
    });

    it('Should return empty verify list when there are no locks.', async() => {
        expect.assertions(1);
        await expect(locks.verify()).resolves.toEqual({
            ours: [],
            theirs: []
        });
    });

});
