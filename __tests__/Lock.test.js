const Lock = require('../common/Lock');

describe('Lock', () => {

    it('Should construct a lock object.', async() => {
        const givenId = "some-test-uuid";
        const givenPath = "/path/to/file";
        const givenTime = new Date().toISOString();
        const givenOwner = {name: "Ken George"};

        const actual = new Lock(givenId, givenPath, givenTime, givenOwner);

        expect.assertions(4);
        expect(actual.id).toBe(givenId);
        expect(actual.path).toBe(givenPath);
        expect(actual.lockTime).toBe(givenTime);
        expect(actual.owner).toBe(givenOwner);
    });
});
