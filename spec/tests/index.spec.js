const originalEnv = process.env;

beforeEach(() => {
    jest.resetModules();
    process.env = Object.assign({}, originalEnv);
});

afterAll(() => {
    process.env = originalEnv;
});

test('it loads sqlite when MYSQL_HOST is not set', () => {
    delete process.env.MYSQL_HOST;
    const db = require('../../src/database');
    const sqlite = require('../../src/database/sqlite');
    expect(db).toBe(sqlite);
});

test('it loads mysql when MYSQL_HOST is set', () => {
    process.env.MYSQL_HOST = 'localhost';
    const db = require('../../src/database');
    const mysql = require('../../src/database/mysql');
    expect(db).toBe(mysql);
});