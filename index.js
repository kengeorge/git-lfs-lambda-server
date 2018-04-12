module.exports = {
    functions: [
        "batch",
        "createLock",
        "deleteLock",
        "listLocks",
        "verifyLocks",
        "verifyObject"
    ],
    manifest: {
        batch: "src/batch.js",
        createLock: "src/createLock.js",
        deleteLock: "src/deleteLock.js",
        listLocks: "src/listLocks.js",
        verifyLocks: "src/verifyLocks.js",
        verifyObject: "src/verifyObject.js",
        common: "src/common",
        modules: "src/node_modules"
    }
};