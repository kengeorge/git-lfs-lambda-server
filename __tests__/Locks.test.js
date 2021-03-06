const Locks = require('../src/common/Locks');

describe('Locks', () => {

    let locks = null;

    beforeAll(() => {
        locks = new Locks();
    });

    //TODO not implemented
    it.skip('Should create a lock', async() => {
        const givenPath = "/fake/path/to/file";
        const now = Date.now();

        const lock = await locks.create(givenPath);

        expect.assertions(3);

        //TODO expect(lock.id).toBe("something");

        expect(lock.path).toBe(givenPath);

        const lockedAt = Date.parse(lock.lockedAt);
        expect(lockedAt).toBeGreaterThanOrEqual(now);
        expect(lockedAt).toBeLessThan(now + 10);

        //TODO expect(lock.owner).toEqual({name: "something"});
    });

    //TODO not implemented
    it.skip('Should return empty lock list when there are no locks.', async() => {
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
