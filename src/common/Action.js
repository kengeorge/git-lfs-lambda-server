class Action {
    constructor(href, expires) {
        this.href = href;
        if(expires) this.expires = expires;
    }
}

module.exports = Action;
