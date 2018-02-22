module.exports = function() {

    return {
        files: [
            'src/**/*.js',
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