const Action = require('../src/common/Action');

describe('Action', () => {

    it('Should construct an action object', async() => {
        const givenHref = "test href";
        const givenExpiration = 200;

        const actual = new Action(givenHref, givenExpiration);

        expect.assertions(2);
        expect(actual.href).toBe(givenHref);
        expect(actual.expires).toBe(givenExpiration);
    });

    it('Should skip expiration if none provided', async() => {
        const givenHref = "test href";

        const actual = new Action(givenHref);

        expect.assertions(2);
        expect(actual.href).toBe(givenHref);
        expect(actual.expires).toBeUndefined();
    });
});
