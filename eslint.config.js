const eslint = require('@eslint/js');
const globals = require('globals');

module.exports = [
    {
        ignores: ['src/front/static/**'],
    },
    eslint.configs.recommended,
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'commonjs',
            globals: globals.node,
        },
    },
    {
        files: ['spec/**/*.js'],
        languageOptions: {
            globals: globals.jest,
        },
    },
    {
        files: ['src/front/**/*.js'],
        languageOptions: {
            parserOptions: {
                ecmaFeatures: { jsx: true },
            },
            globals: {
                ...globals.browser,
                React: 'readonly',
                ReactBootstrap: 'readonly',
                ReactDOM: 'readonly',
            },
        },
    },
];