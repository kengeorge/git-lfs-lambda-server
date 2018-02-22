class Lock {
    constructor(id, path, lockTime, owner) {
        this.id = id;
        this.path = path;
        this.lockedAt = lockTime;
        this.owner = owner;
    }
}

module.exports = Lock;