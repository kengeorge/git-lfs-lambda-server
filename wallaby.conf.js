module.exports = function() {

    return {
        files: [
            '**/*.js',
            '!node_modules/**/*',
            '!**/__tests__/**/*.js'
        ],

        tests: [
            '**/__tests__/**/*.js?(x)',
            '**/?(*.)(spec|test).js?(x)'
        ],

        env: {
            type: 'node',
            runner: 'node'
        },

        testFramework: 'jest',
    };
};