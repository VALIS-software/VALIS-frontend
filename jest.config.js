module.exports = {
    'roots': [
        './src',
    ],

    'transform': {
        '^.+\\.tsx?$': 'ts-jest',
        '^.+\\.jsx?$': 'ts-jest',
    },

    'testRegex': '(/__tests__/.*|(\\.|/)(test))\\.(jsx?|tsx?)$',

    'moduleFileExtensions': [
        'ts',
        'tsx',
        'js',
        'jsx',
        'json',
        'node',
    ],

    'setupTestFrameworkScriptFile': './test/setupFramework.ts',

    'moduleNameMapper': {
        '\\.(css)$': '<rootDir>/test/__mocks__/styleMock.js',
    },

    'coveragePathIgnorePatterns': [
        '/node_modules/',
        'test'
    ],
};
