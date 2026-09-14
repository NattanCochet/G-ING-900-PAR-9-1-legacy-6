if (!process.env.SQLITE_DB_LOCATION) {
    process.env.SQLITE_DB_LOCATION = require('os').tmpdir() + '/todo.db';
}
const db = require('../../src/database/sqlite');
const fs = require('fs');
const location = process.env.SQLITE_DB_LOCATION;

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
    id: 'task-id-1',
    project_id: 'proj-id-1',
    column_id: 'col-id-1',
    creator_id: 'user-id-123',
    name: 'Premiere tache',
    description: 'Description de la tache',
    completed: false,
    deadline: '2026-12-31',
    priority: 'high',
};

beforeEach(async () => {
    if (fs.existsSync(location)) {
        try {
            await db.teardown();
        } catch {
            // ignore
        }
        fs.unlinkSync(location);
    }
});

test('it initializes correctly', async () => {
    await db.init();
});

test('it can create and retrieve user by email', async () => {
    await db.init();

    await db.createUser(USER);

    const user = await db.getUserByEmail(USER.email);
    expect(user).toEqual(USER);
});

test('it can remove a user', async () => {
    await db.init();
    await db.createUser(USER);

    await db.deleteUser(USER.id);

    const user = await db.getUserByEmail(USER.email);
    expect(user).toBeUndefined();
});

test('it can create, get, update, and delete projects', async () => {
    await db.init();
    await db.createUser(USER);

    await db.createProject(PROJECT);
    const projects = await db.getProjects(USER.id);
    expect(projects.length).toBe(1);
    expect(projects[0].name).toBe(PROJECT.name);

    const single = await db.getProject(PROJECT.id);
    expect(single.name).toBe(PROJECT.name);

    await db.updateProject(PROJECT.id, { name: 'Nom modifie', description: 'Desc modifiee' });
    const updated = await db.getProject(PROJECT.id);
    expect(updated.name).toBe('Nom modifie');

    await db.deleteProject(PROJECT.id);
    const afterDelete = await db.getProject(PROJECT.id);
    expect(afterDelete).toBeUndefined();
});

test('it can create, get, update, and delete columns', async () => {
    await db.init();
    await db.createUser(USER);
    await db.createProject(PROJECT);

    await db.createColumn(COLUMN);
    const cols = await db.getColumns(PROJECT.id);
    expect(cols.length).toBe(1);
    expect(cols[0].name).toBe(COLUMN.name);

    await db.updateColumn(COLUMN.id, { name: 'En cours', description: 'Nouveau' });
    const updated = await db.getColumn(COLUMN.id);
    expect(updated.name).toBe('En cours');

    await db.deleteColumn(COLUMN.id);
    const afterDelete = await db.getColumn(COLUMN.id);
    expect(afterDelete).toBeUndefined();
});

test('it can create, get, update, and delete tasks', async () => {
    await db.init();
    await db.createUser(USER);
    await db.createProject(PROJECT);
    await db.createColumn(COLUMN);

    await db.createTask(TASK);
    const tasks = await db.getTasks(PROJECT.id);
    expect(tasks.length).toBe(1);
    expect(tasks[0].name).toBe(TASK.name);
    expect(tasks[0].completed).toBe(false);

    await db.updateTask(TASK.id, { name: 'Tache finie', description: 'Done', completed: true, column_id: COLUMN.id, deadline: '2026-12-31', priority: 'high' });
    const updated = await db.getTask(TASK.id);
    expect(updated.name).toBe('Tache finie');
    expect(updated.completed).toBe(true);
    expect(updated.deadline).toBe('2026-12-31');
    expect(updated.priority).toBe('high');

    await db.deleteTask(TASK.id);
    const afterDelete = await db.getTask(TASK.id);
    expect(afterDelete).toBeUndefined();
});

test('it cascades delete from project to columns and tasks', async () => {
    await db.init();
    await db.createUser(USER);
    await db.createProject(PROJECT);
    await db.createColumn(COLUMN);
    await db.createTask(TASK);

    // Delete project -> should cascade delete column and task
    await db.deleteProject(PROJECT.id);

    const cols = await db.getColumns(PROJECT.id);
    expect(cols.length).toBe(0);

    const task = await db.getTask(TASK.id);
    expect(task).toBeUndefined();
});

test('it cascades delete from user to projects, columns, and tasks', async () => {
    await db.init();
    await db.createUser(USER);
    await db.createProject(PROJECT);
    await db.createColumn(COLUMN);
    await db.createTask(TASK);

    // Delete user -> should cascade delete project, column, and task
    await db.deleteUser(USER.id);

    const proj = await db.getProject(PROJECT.id);
    expect(proj).toBeUndefined();

    const cols = await db.getColumns(PROJECT.id);
    expect(cols.length).toBe(0);

    const task = await db.getTask(TASK.id);
    expect(task).toBeUndefined();
});

test('it cascades delete from column to tasks', async () => {
    await db.init();
    await db.createUser(USER);
    await db.createProject(PROJECT);
    await db.createColumn(COLUMN);
    await db.createTask(TASK);

    // Delete column -> should cascade delete task
    await db.deleteColumn(COLUMN.id);

    const task = await db.getTask(TASK.id);
    expect(task).toBeUndefined();
});

test('it closes connection correctly on teardown', async () => {
    await db.init();
    await db.teardown();
});
