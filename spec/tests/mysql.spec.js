const waitPort = require('wait-port');
const mysql = require('mysql2');

let poolMock;

jest.mock('wait-port', () => jest.fn());
jest.mock('mysql2', () => ({
    createPool: jest.fn(),
}));

process.env.MYSQL_HOST = 'test-mysql-host';

const db = require('../../src/database/mysql');

const ITEM = {
    id: '7aef3d7c-d301-4846-8358-2a91ec9d6be3',
    name: 'Test',
    completed: false,
};

beforeEach(() => {
    poolMock = {
        query: jest.fn(),
        end: jest.fn(),
    };
    mysql.createPool.mockReturnValue(poolMock);
    waitPort.mockReturnValue(Promise.resolve(true));
});

test('it initializes correctly', async () => {
    poolMock.query.mockImplementation((query, cb) => cb(null));

    await db.init();

    expect(waitPort.mock.calls.length).toBe(1);
    expect(waitPort.mock.calls[0][0]).toEqual(
        expect.objectContaining({ port: 3306, timeout: 10000, waitForDns: true }),
    );
    expect(mysql.createPool.mock.calls.length).toBe(1);
    expect(poolMock.query.mock.calls.length).toBe(1);
    expect(poolMock.query.mock.calls[0][0]).toContain('CREATE TABLE IF NOT EXISTS todo_items');
});

test('it rejects initialization if query fails', async () => {
    poolMock.query.mockImplementation((query, cb) => cb(new Error('init failure')));

    await expect(db.init()).rejects.toThrow('init failure');
});

test('it closes connection pool on teardown', async () => {
    poolMock.query.mockImplementation((query, cb) => cb(null));
    await db.init();

    poolMock.end.mockImplementation(cb => cb(null));

    await db.teardown();

    expect(poolMock.end.mock.calls.length).toBe(1);
});

test('it rejects teardown if pool.end fails', async () => {
    poolMock.query.mockImplementation((query, cb) => cb(null));
    await db.init();

    poolMock.end.mockImplementation(cb => cb(new Error('close failure')));

    await expect(db.teardown()).rejects.toThrow('close failure');
});

test('it can store an item', async () => {
    poolMock.query.mockImplementation((query, cb) => cb(null));
    await db.init();

    poolMock.query.mockImplementation((sql, values, cb) => cb(null));

    await db.storeItem(ITEM);

    expect(poolMock.query.mock.calls.length).toBe(2);
    expect(poolMock.query.mock.calls[1][0]).toBe(
        'INSERT INTO todo_items (id, name, completed) VALUES (?, ?, ?)',
    );
    expect(poolMock.query.mock.calls[1][1]).toEqual([ITEM.id, ITEM.name, 0]);
});

test('it rejects storeItem on error', async () => {
    poolMock.query.mockImplementation((query, cb) => cb(null));
    await db.init();

    poolMock.query.mockImplementation((sql, values, cb) => cb(new Error('insert error')));

    await expect(db.storeItem(ITEM)).rejects.toThrow('insert error');
});

test('it can get all items and maps completed boolean properly', async () => {
    poolMock.query.mockImplementation((query, cb) => cb(null));
    await db.init();

    const rawRows = [
        { id: ITEM.id, name: ITEM.name, completed: 0 },
        { id: 'item-2', name: 'Task 2', completed: 1 },
    ];
    poolMock.query.mockImplementation((sql, cb) => cb(null, rawRows));

    const items = await db.getItems();

    expect(poolMock.query.mock.calls.length).toBe(2);
    expect(poolMock.query.mock.calls[1][0]).toBe('SELECT * FROM todo_items');
    expect(items).toEqual([
        { id: ITEM.id, name: ITEM.name, completed: false },
        { id: 'item-2', name: 'Task 2', completed: true },
    ]);
});

test('it rejects getItems on query error', async () => {
    poolMock.query.mockImplementation((query, cb) => cb(null));
    await db.init();

    poolMock.query.mockImplementation((sql, cb) => cb(new Error('select error')));

    await expect(db.getItems()).rejects.toThrow('select error');
});

test('it can get a single item', async () => {
    poolMock.query.mockImplementation((query, cb) => cb(null));
    await db.init();

    const rawRows = [{ id: ITEM.id, name: ITEM.name, completed: 0 }];
    poolMock.query.mockImplementation((sql, params, cb) => cb(null, rawRows));

    const item = await db.getItem(ITEM.id);

    expect(poolMock.query.mock.calls.length).toBe(2);
    expect(poolMock.query.mock.calls[1][0]).toBe('SELECT * FROM todo_items WHERE id=?');
    expect(poolMock.query.mock.calls[1][1]).toEqual([ITEM.id]);
    expect(item).toEqual(ITEM);
});

test('it returns undefined if item is not found', async () => {
    poolMock.query.mockImplementation((query, cb) => cb(null));
    await db.init();

    poolMock.query.mockImplementation((sql, params, cb) => cb(null, []));

    const item = await db.getItem('missing-id');

    expect(item).toBeUndefined();
});

test('it rejects getItem on query error', async () => {
    poolMock.query.mockImplementation((query, cb) => cb(null));
    await db.init();

    poolMock.query.mockImplementation((sql, params, cb) => cb(new Error('get error')));

    await expect(db.getItem('some-id')).rejects.toThrow('get error');
});

test('it can update an existing item', async () => {
    poolMock.query.mockImplementation((query, cb) => cb(null));
    await db.init();

    poolMock.query.mockImplementation((sql, params, cb) => cb(null));

    const updated = { name: 'Updated name', completed: true };
    await db.updateItem(ITEM.id, updated);

    expect(poolMock.query.mock.calls.length).toBe(2);
    expect(poolMock.query.mock.calls[1][0]).toBe(
        'UPDATE todo_items SET name=?, completed=? WHERE id=?',
    );
    expect(poolMock.query.mock.calls[1][1]).toEqual(['Updated name', 1, ITEM.id]);
});

test('it rejects updateItem on error', async () => {
    poolMock.query.mockImplementation((query, cb) => cb(null));
    await db.init();

    poolMock.query.mockImplementation((sql, params, cb) => cb(new Error('update error')));

    await expect(db.updateItem(ITEM.id, ITEM)).rejects.toThrow('update error');
});

test('it can remove an existing item', async () => {
    poolMock.query.mockImplementation((query, cb) => cb(null));
    await db.init();

    poolMock.query.mockImplementation((sql, params, cb) => cb(null));

    await db.removeItem(ITEM.id);

    expect(poolMock.query.mock.calls.length).toBe(2);
    expect(poolMock.query.mock.calls[1][0]).toBe('DELETE FROM todo_items WHERE id=?');
    expect(poolMock.query.mock.calls[1][1]).toEqual([ITEM.id]);
});

test('it rejects removeItem on error', async () => {
    poolMock.query.mockImplementation((query, cb) => cb(null));
    await db.init();

    poolMock.query.mockImplementation((sql, params, cb) => cb(new Error('delete error')));

    await expect(db.removeItem(ITEM.id)).rejects.toThrow('delete error');
});