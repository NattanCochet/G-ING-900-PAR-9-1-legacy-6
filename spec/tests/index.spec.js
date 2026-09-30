const originalEnv = process.env;

beforeEach(() => {
    jest.resetModules();
    process.env = Object.assign({}, originalEnv);
});

afterAll(() => {
    process.env = originalEnv;
});

test('it loads sqlite database by default', () => {
    delete process.env.DB_TYPE;
    delete process.env.MYSQL_HOST;
    const db = require('../../src/database');
    const sqlite = require('../../src/database/sqlite');
    expect(db).toBe(sqlite);
});

test('it loads sqlite database when DB_TYPE=sqlite3', () => {
    process.env.DB_TYPE = 'sqlite3';
    const db = require('../../src/database');
    const sqlite = require('../../src/database/sqlite');
    expect(db).toBe(sqlite);
});

test('it loads sqlite database when DB_TYPE=sqlite', () => {
    process.env.DB_TYPE = 'sqlite';
    const db = require('../../src/database');
    const sqlite = require('../../src/database/sqlite');
    expect(db).toBe(sqlite);
});

test('it loads mysql database when DB_TYPE=mysql', () => {
    process.env.DB_TYPE = 'mysql';
    const db = require('../../src/database');
    const mysql = require('../../src/database/mysql');
    expect(db).toBe(mysql);
});

test('it loads mysql database when MYSQL_HOST is set and DB_TYPE is not set', () => {
    delete process.env.DB_TYPE;
    process.env.MYSQL_HOST = 'localhost';
    const db = require('../../src/database');
    const mysql = require('../../src/database/mysql');
    expect(db).toBe(mysql);
});

test('it loads sqlite when DB_TYPE=sqlite3 even if MYSQL_HOST is set', () => {
    process.env.DB_TYPE = 'sqlite3';
    process.env.MYSQL_HOST = 'localhost';
    const db = require('../../src/database');
    const sqlite = require('../../src/database/sqlite');
    expect(db).toBe(sqlite);
});
