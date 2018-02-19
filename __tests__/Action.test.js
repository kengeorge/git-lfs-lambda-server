const Action = require('../common/Action');

describe('Action', () => {

    it('Should construct an action object.', async() => {
        const givenHref = "test href";
        const givenExpiration = 200;

        const actual = new Action(givenHref, givenExpiration);

        expect.assertions(2);
        expect(actual.href).toBe(givenHref);
        expect(actual.expires).toBe(givenExpiration);
    });
});
