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

const USER = {
    id: 'user-id-123',
    name: 'Alice',
    email: 'alice@example.com',
    password: 'hashed_password',
};

const PROJECT = {
    id: 'proj-id-1',
    creator_id: 'user-id-123',
    name: 'Mon Projet Kanban',
    description: 'Description du projet',
};

const COLUMN = {
    id: 'col-id-1',
    project_id: 'proj-id-1',
    name: 'A faire',
    description: 'Taches en attente',
};

const TASK = {
    id: '7aef3d7c-d301-4846-8358-2a91ec9d6be3',
    project_id: 'proj-id-1',
    column_id: 'col-id-1',
    creator_id: 'user-id-123',
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
        expect.objectContaining({ port: 3306, timeout: 30000, waitForDns: true }),
    );
    expect(mysql.createPool.mock.calls.length).toBe(1);
    expect(poolMock.query.mock.calls.length).toBe(7);
    expect(poolMock.query.mock.calls[0][0]).toContain('CREATE TABLE IF NOT EXISTS users');
    expect(poolMock.query.mock.calls[1][0]).toContain('CREATE TABLE IF NOT EXISTS projects');
    expect(poolMock.query.mock.calls[2][0]).toContain('CREATE TABLE IF NOT EXISTS columns');
    expect(poolMock.query.mock.calls[3][0]).toContain('CREATE TABLE IF NOT EXISTS tasks');
    expect(poolMock.query.mock.calls[6][0]).toContain('CREATE TABLE IF NOT EXISTS task_users');
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

// User tests
test('it can store a user', async () => {
    poolMock.query.mockImplementation((query, cb) => cb(null));
    await db.init();

    poolMock.query.mockImplementation((sql, values, cb) => cb(null));

    await db.createUser(USER);

    expect(poolMock.query.mock.calls.length).toBe(8);
    expect(poolMock.query.mock.calls[7][1]).toEqual([USER.id, USER.name, USER.email, USER.password]);
});

test('it can get user by email', async () => {
    poolMock.query.mockImplementation((query, cb) => cb(null));
    await db.init();

    poolMock.query.mockImplementation((sql, params, cb) => cb(null, [USER]));

    const user = await db.getUserByEmail(USER.email);
    expect(user).toEqual(USER);
});

test('it can get user by id', async () => {
    poolMock.query.mockImplementation((query, cb) => cb(null));
    await db.init();

    poolMock.query.mockImplementation((sql, params, cb) => cb(null, [USER]));

    const user = await db.getUserById(USER.id);
    expect(user).toEqual(USER);
});

test('it can remove a user', async () => {
    poolMock.query.mockImplementation((query, cb) => cb(null));
    await db.init();

    poolMock.query.mockImplementation((sql, params, cb) => cb(null));

    await db.deleteUser(USER.id);

    expect(poolMock.query.mock.calls.length).toBe(8);
    expect(poolMock.query.mock.calls[7][1]).toEqual([USER.id]);
});

// Project tests
test('it can create a project', async () => {
    poolMock.query.mockImplementation((query, cb) => cb(null));
    await db.init();

    poolMock.query.mockImplementation((sql, values, cb) => cb(null));

    await db.createProject(PROJECT);

    expect(poolMock.query.mock.calls.length).toBe(8);
    expect(poolMock.query.mock.calls[7][1]).toEqual([PROJECT.id, PROJECT.creator_id, PROJECT.name, PROJECT.description]);
});

test('it can get projects by creator or all', async () => {
    poolMock.query.mockImplementation((query, cb) => cb(null));
    await db.init();

    poolMock.query.mockImplementation((sql, params, cb) => cb(null, [PROJECT]));

    const projects = await db.getProjects(USER.id);
    expect(projects).toEqual([PROJECT]);

    const allProjects = await db.getProjects();
    expect(allProjects).toEqual([PROJECT]);
});

test('it can get a single project', async () => {
    poolMock.query.mockImplementation((query, cb) => cb(null));
    await db.init();

    poolMock.query.mockImplementation((sql, params, cb) => cb(null, [PROJECT]));

    const project = await db.getProject(PROJECT.id);
    expect(project).toEqual(PROJECT);
});

test('it can update and delete a project', async () => {
    poolMock.query.mockImplementation((query, cb) => cb(null));
    await db.init();

    poolMock.query.mockImplementation((sql, params, cb) => cb(null));

    await db.updateProject(PROJECT.id, { name: 'New Name', description: 'New Desc' });
    expect(poolMock.query.mock.calls[7][1]).toEqual(['New Name', 'New Desc', PROJECT.id]);

    await db.deleteProject(PROJECT.id);
    expect(poolMock.query.mock.calls[8][1]).toEqual([PROJECT.id]);
});

// Column tests
test('it can create, get, update, and delete columns', async () => {
    poolMock.query.mockImplementation((query, cb) => cb(null));
    await db.init();

    poolMock.query.mockImplementation((sql, values, cb) => cb(null));

    await db.createColumn(COLUMN);
    expect(poolMock.query.mock.calls[7][1]).toEqual([COLUMN.id, COLUMN.project_id, COLUMN.name, COLUMN.description]);

    poolMock.query.mockImplementation((sql, params, cb) => cb(null, [COLUMN]));
    const cols = await db.getColumns(PROJECT.id);
    expect(cols).toEqual([COLUMN]);

    const col = await db.getColumn(COLUMN.id);
    expect(col).toEqual(COLUMN);

    poolMock.query.mockImplementation((sql, params, cb) => cb(null));
    await db.updateColumn(COLUMN.id, { name: 'Col New', description: 'Desc' });
    expect(poolMock.query.mock.calls[10][1]).toEqual(['Col New', 'Desc', COLUMN.id]);

    await db.deleteColumn(COLUMN.id);
    expect(poolMock.query.mock.calls[11][1]).toEqual([COLUMN.id]);
});

// Task tests
test('it can store a task', async () => {
    poolMock.query.mockImplementation((query, cb) => cb(null));
    await db.init();

    poolMock.query.mockImplementation((sql, values, cb) => cb(null));

    await db.createTask(TASK);

    expect(poolMock.query.mock.calls.length).toBe(8);
    expect(poolMock.query.mock.calls[7][1]).toEqual([
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

    expect(poolMock.query.mock.calls.length).toBe(8);
    expect(tasks).toEqual([
        { id: TASK.id, name: TASK.name, completed: false },
        { id: 'task-2', name: 'Task 2', completed: true },
    ]);
});

test('it can get tasks by column', async () => {
    poolMock.query.mockImplementation((query, cb) => cb(null));
    await db.init();

    const rawRows = [
        { id: TASK.id, name: TASK.name, completed: 0 },
    ];
    poolMock.query.mockImplementation((sql, params, cb) => cb(null, rawRows));

    const tasks = await db.getTasksByColumn('col-1');

    expect(poolMock.query.mock.calls.length).toBe(8);
    expect(tasks).toEqual([
        { id: TASK.id, name: TASK.name, completed: false },
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

    expect(poolMock.query.mock.calls.length).toBe(8);
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

    expect(poolMock.query.mock.calls.length).toBe(8);
});

test('it can remove an existing task', async () => {
    poolMock.query.mockImplementation((query, cb) => cb(null));
    await db.init();

    poolMock.query.mockImplementation((sql, params, cb) => cb(null));

    await db.deleteTask(TASK.id);

    expect(poolMock.query.mock.calls.length).toBe(8);
});

// Task Users tests
test('it can assign a user to a task and get task users', async () => {
    poolMock.query.mockImplementation((query, cb) => cb(null));
    await db.init();

    poolMock.query.mockImplementation((sql, params, cb) => cb(null));

    await db.assignUserToTask(TASK.id, USER.id);
    expect(poolMock.query.mock.calls[7][1]).toEqual([TASK.id, USER.id]);

    poolMock.query.mockImplementation((sql, params, cb) => cb(null, [USER]));
    const users = await db.getTaskUsers(TASK.id);
    expect(users).toEqual([USER]);
});
