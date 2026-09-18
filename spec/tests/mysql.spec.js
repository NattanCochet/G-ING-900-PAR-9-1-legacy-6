const waitPort = require('wait-port');
const mysql = require('mysql2');

let poolMock;

jest.mock('wait-port', () => jest.fn());
jest.mock('mysql2', () => ({
    createPool: jest.fn(),
}));

const originalMysqlHost = process.env.MYSQL_HOST;
process.env.MYSQL_HOST = 'test-mysql-host';

afterAll(() => {
    if (originalMysqlHost === undefined) delete process.env.MYSQL_HOST;
    else process.env.MYSQL_HOST = originalMysqlHost;
});
const db = require('../../src/database/mysql');

const TASK = {
    id: '7aef3d7c-d301-4846-8358-2a91ec9d6be3',
    project_id: 'proj-1',
    column_id: 'col-1',
    creator_id: 'user-1',
    name: 'Test',
    description: null,
    completed: false,
    deadline: '2026-12-31',
    priority: 'high',
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
    expect(poolMock.query.mock.calls.length).toBe(3);
    expect(poolMock.query.mock.calls[0][0]).toContain('CREATE TABLE IF NOT EXISTS tasks');
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

test('it can store a task', async () => {
    poolMock.query.mockImplementation((query, cb) => cb(null));
    await db.init();

    poolMock.query.mockImplementation((sql, values, cb) => cb(null));

    await db.createTask(TASK);

    expect(poolMock.query.mock.calls.length).toBe(4);
    expect(poolMock.query.mock.calls[3][1]).toEqual([
        TASK.id,
        TASK.project_id,
        TASK.column_id,
        TASK.creator_id,
        TASK.name,
        null,
        0,
        '2026-12-31',
        'high',
    ]);
});

test('it rejects createTask on error', async () => {
    poolMock.query.mockImplementation((query, cb) => cb(null));
    await db.init();

    poolMock.query.mockImplementation((sql, values, cb) => cb(new Error('insert error')));

    await expect(db.createTask(TASK)).rejects.toThrow('insert error');
});

test('it can get tasks', async () => {
    poolMock.query.mockImplementation((query, cb) => cb(null));
    await db.init();

    const rawRows = [
        { id: TASK.id, name: TASK.name, completed: 0 },
        { id: 'task-2', name: 'Task 2', completed: 1 },
    ];
    poolMock.query.mockImplementation((sql, params, cb) => cb(null, rawRows));

    const tasks = await db.getTasks('proj-1');

    expect(poolMock.query.mock.calls.length).toBe(4);
    expect(tasks).toEqual([
        { id: TASK.id, name: TASK.name, completed: false },
        { id: 'task-2', name: 'Task 2', completed: true },
    ]);
});

test('it rejects getTasks on query error', async () => {
    poolMock.query.mockImplementation((query, cb) => cb(null));
    await db.init();

    poolMock.query.mockImplementation((sql, params, cb) => cb(new Error('select error')));

    await expect(db.getTasks()).rejects.toThrow('select error');
});

test('it can get a single task', async () => {
    poolMock.query.mockImplementation((query, cb) => cb(null));
    await db.init();

    const rawRows = [{ id: TASK.id, name: TASK.name, completed: 0 }];
    poolMock.query.mockImplementation((sql, params, cb) => cb(null, rawRows));

    const task = await db.getTask(TASK.id);

    expect(poolMock.query.mock.calls.length).toBe(4);
    expect(task).toEqual(expect.objectContaining({ id: TASK.id, name: TASK.name }));
});

test('it returns undefined if task is not found', async () => {
    poolMock.query.mockImplementation((query, cb) => cb(null));
    await db.init();

    poolMock.query.mockImplementation((sql, params, cb) => cb(null, []));

    const task = await db.getTask('missing-id');

    expect(task).toBeUndefined();
});

test('it can update an existing task', async () => {
    poolMock.query.mockImplementation((query, cb) => cb(null));
    await db.init();

    poolMock.query.mockImplementation((sql, params, cb) => cb(null));

    const updated = { name: 'Updated name', completed: true, column_id: 'col-2', deadline: '2026-12-31', priority: 'high' };
    await db.updateTask(TASK.id, updated);

    expect(poolMock.query.mock.calls.length).toBe(4);
});

test('it can remove an existing task', async () => {
    poolMock.query.mockImplementation((query, cb) => cb(null));
    await db.init();

    poolMock.query.mockImplementation((sql, params, cb) => cb(null));

    await db.deleteTask(TASK.id);

    expect(poolMock.query.mock.calls.length).toBe(4);
});
