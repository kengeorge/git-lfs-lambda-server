const VerifyLocksProcessor = require('../VerifyLocksProcessor');

describe('VerifyLocksProcessor', () => {

    let processor = null;
    beforeEach(() =>{
       processor = new VerifyLocksProcessor();
    });

    it('Should return empty lists when there are no locks.', async() => {
        await expect(processor.process()).resolves.toEqual({
            ours: [],
            theirs: []
        });
    });
});
