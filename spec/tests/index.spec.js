const originalEnv = process.env;

beforeEach(() => {
    jest.resetModules();
    process.env = Object.assign({}, originalEnv);
});

afterAll(() => {
    process.env = originalEnv;
});

test('it loads sqlite database', () => {
    delete process.env.MYSQL_HOST;
    const db = require('../../src/database');
    const sqlite = require('../../src/database/sqlite');
    expect(db).toBe(sqlite);
});