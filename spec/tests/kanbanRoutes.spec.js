const db = require('../../src/database');
const addProject = require('../../src/routes/addProject');
const { getProjects, getProjectById } = require('../../src/routes/getProjects');
const updateProject = require('../../src/routes/updateProject');
const deleteProject = require('../../src/routes/deleteProject');

const addColumn = require('../../src/routes/addColumn');
const { getColumns, getColumnById } = require('../../src/routes/getColumns');
const updateColumn = require('../../src/routes/updateColumn');
const deleteColumn = require('../../src/routes/deleteColumn');

const addTask = require('../../src/routes/addTask');
const { getTasks, getTaskById } = require('../../src/routes/getTasks');
const updateTask = require('../../src/routes/updateTask');
const deleteTask = require('../../src/routes/deleteTask');

const { v4: uuid } = require('uuid');

jest.mock('uuid', () => ({ v4: jest.fn() }));

jest.mock('../../src/database', () => ({
    createProject: jest.fn(),
    getProjects: jest.fn(),
    getProject: jest.fn(),
    updateProject: jest.fn(),
    deleteProject: jest.fn(),

    createColumn: jest.fn(),
    getColumns: jest.fn(),
    getColumn: jest.fn(),
    updateColumn: jest.fn(),
    deleteColumn: jest.fn(),

    createTask: jest.fn(),
    getTasks: jest.fn(),
    getTasksByColumn: jest.fn(),
    getTask: jest.fn(),
    updateTask: jest.fn(),
    deleteTask: jest.fn(),
}));

beforeEach(() => {
    jest.clearAllMocks();
});

describe('Project routes', () => {
    test('it creates a project', async () => {
        uuid.mockReturnValue('proj-uuid');
        const req = {
            body: { name: 'Projet Kanban', description: 'Description' },
            user: { id: 'user-1' },
        };
        const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

        await addProject(req, res);

        expect(db.createProject).toHaveBeenCalledWith({
            id: 'proj-uuid',
            creator_id: 'user-1',
            name: 'Projet Kanban',
            description: 'Description',
        });
        expect(res.status).toHaveBeenCalledWith(201);
    });

    test('it returns 400 when project name is missing', async () => {
        const req = { body: {}, user: { id: 'user-1' } };
        const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

        await addProject(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('it gets projects for user', async () => {
        const req = { user: { id: 'user-1' }, query: {} };
        const res = { send: jest.fn() };
        db.getProjects.mockResolvedValue([{ id: 'proj-1' }]);

        await getProjects(req, res);
        expect(db.getProjects).toHaveBeenCalledWith('user-1');
        expect(res.send).toHaveBeenCalledWith([{ id: 'proj-1' }]);
    });

    test('it gets a project by id', async () => {
        const req = { params: { id: 'proj-1' } };
        const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
        db.getProject.mockResolvedValue({ id: 'proj-1', name: 'Mon Projet' });

        await getProjectById(req, res);
        expect(db.getProject).toHaveBeenCalledWith('proj-1');
        expect(res.send).toHaveBeenCalledWith({ id: 'proj-1', name: 'Mon Projet' });
    });

    test('it returns 404 when project is not found by id', async () => {
        const req = { params: { id: 'proj-unknown' } };
        const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
        db.getProject.mockResolvedValue(null);

        await getProjectById(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    test('it updates a project', async () => {
        const req = {
            params: { id: 'proj-1' },
            body: { name: 'Updated Name', description: 'Updated Desc' },
        };
        const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
        db.getProject
            .mockResolvedValueOnce({ id: 'proj-1', name: 'Old Name', description: 'Old Desc' })
            .mockResolvedValueOnce({ id: 'proj-1', name: 'Updated Name', description: 'Updated Desc' });

        await updateProject(req, res);
        expect(db.updateProject).toHaveBeenCalledWith('proj-1', {
            name: 'Updated Name',
            description: 'Updated Desc',
        });
        expect(res.send).toHaveBeenCalledWith({
            id: 'proj-1',
            name: 'Updated Name',
            description: 'Updated Desc',
        });
    });

    test('it returns 404 when updating non-existent project', async () => {
        const req = { params: { id: 'proj-unknown' }, body: { name: 'New' } };
        const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
        db.getProject.mockResolvedValue(null);

        await updateProject(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    test('it deletes a project', async () => {
        const req = { params: { id: 'proj-1' } };
        const res = { sendStatus: jest.fn() };

        await deleteProject(req, res);
        expect(db.deleteProject).toHaveBeenCalledWith('proj-1');
        expect(res.sendStatus).toHaveBeenCalledWith(200);
    });
});

describe('Column routes', () => {
    test('it creates a column', async () => {
        uuid.mockReturnValue('col-uuid');
        const req = {
            body: { name: 'A faire', project_id: 'proj-1' },
        };
        const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

        await addColumn(req, res);
        expect(db.createColumn).toHaveBeenCalledWith({
            id: 'col-uuid',
            project_id: 'proj-1',
            name: 'A faire',
            description: null,
        });
        expect(res.status).toHaveBeenCalledWith(201);
    });

    test('it gets columns for a project', async () => {
        const req = { query: { project_id: 'proj-1' }, params: {} };
        const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
        db.getColumns.mockResolvedValue([{ id: 'col-1', name: 'A faire' }]);

        await getColumns(req, res);
        expect(db.getColumns).toHaveBeenCalledWith('proj-1');
        expect(res.send).toHaveBeenCalledWith([{ id: 'col-1', name: 'A faire' }]);
    });

    test('it returns 400 when project_id is missing for getColumns', async () => {
        const req = { query: {}, params: {} };
        const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

        await getColumns(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('it gets a column by id', async () => {
        const req = { params: { id: 'col-1' } };
        const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
        db.getColumn.mockResolvedValue({ id: 'col-1', name: 'En cours' });

        await getColumnById(req, res);
        expect(db.getColumn).toHaveBeenCalledWith('col-1');
        expect(res.send).toHaveBeenCalledWith({ id: 'col-1', name: 'En cours' });
    });

    test('it returns 404 when column is not found by id', async () => {
        const req = { params: { id: 'col-unknown' } };
        const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
        db.getColumn.mockResolvedValue(null);

        await getColumnById(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    test('it updates a column', async () => {
        const req = {
            params: { id: 'col-1' },
            body: { name: 'Terminé' },
        };
        const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
        db.getColumn
            .mockResolvedValueOnce({ id: 'col-1', name: 'En cours', description: null })
            .mockResolvedValueOnce({ id: 'col-1', name: 'Terminé', description: null });

        await updateColumn(req, res);
        expect(db.updateColumn).toHaveBeenCalledWith('col-1', {
            name: 'Terminé',
            description: null,
        });
        expect(res.send).toHaveBeenCalledWith({
            id: 'col-1',
            name: 'Terminé',
            description: null,
        });
    });

    test('it returns 404 when updating non-existent column', async () => {
        const req = { params: { id: 'col-unknown' }, body: { name: 'Terminé' } };
        const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
        db.getColumn.mockResolvedValue(null);

        await updateColumn(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    test('it deletes a column', async () => {
        const req = { params: { id: 'col-1' } };
        const res = { sendStatus: jest.fn() };

        await deleteColumn(req, res);
        expect(db.deleteColumn).toHaveBeenCalledWith('col-1');
        expect(res.sendStatus).toHaveBeenCalledWith(200);
    });
});

describe('Task routes', () => {
    test('it creates a task', async () => {
        uuid.mockReturnValue('task-uuid');
        const req = {
            body: { name: 'Nouvelle tache', project_id: 'proj-1', column_id: 'col-1', deadline: '2026-12-31', priority: 'high' },
            user: { id: 'user-1' },
        };
        const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

        await addTask(req, res);
        expect(db.createTask).toHaveBeenCalledWith({
            id: 'task-uuid',
            project_id: 'proj-1',
            column_id: 'col-1',
            creator_id: 'user-1',
            name: 'Nouvelle tache',
            description: null,
            completed: false,
            deadline: '2026-12-31',
            priority: 'high',
        });
        expect(res.status).toHaveBeenCalledWith(201);
    });

    test('it gets tasks by project', async () => {
        const req = { query: { project_id: 'proj-1' }, params: {} };
        const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
        db.getTasks.mockResolvedValue([{ id: 'task-1', name: 'Task 1' }]);

        await getTasks(req, res);
        expect(db.getTasks).toHaveBeenCalledWith('proj-1');
        expect(res.send).toHaveBeenCalledWith([{ id: 'task-1', name: 'Task 1' }]);
    });

    test('it gets tasks by column when column_id is provided', async () => {
        const req = { query: { column_id: 'col-1' }, params: {} };
        const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
        db.getTasksByColumn.mockResolvedValue([{ id: 'task-1', name: 'Task 1' }]);

        await getTasks(req, res);
        expect(db.getTasksByColumn).toHaveBeenCalledWith('col-1');
        expect(res.send).toHaveBeenCalledWith([{ id: 'task-1', name: 'Task 1' }]);
    });

    test('it gets a task by id', async () => {
        const req = { params: { id: 'task-1' } };
        const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
        db.getTask.mockResolvedValue({ id: 'task-1', name: 'Task 1' });

        await getTaskById(req, res);
        expect(db.getTask).toHaveBeenCalledWith('task-1');
        expect(res.send).toHaveBeenCalledWith({ id: 'task-1', name: 'Task 1' });
    });

    test('it returns 404 when task is not found by id', async () => {
        const req = { params: { id: 'task-unknown' } };
        const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
        db.getTask.mockResolvedValue(null);

        await getTaskById(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    test('it updates a task', async () => {
        const req = {
            params: { id: 'task-1' },
            body: { completed: true, deadline: '2026-12-31', priority: 'high' },
        };
        const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
        db.getTask
            .mockResolvedValueOnce({
                id: 'task-1',
                name: 'Task 1',
                description: null,
                completed: false,
                column_id: 'col-1',
            })
            .mockResolvedValueOnce({
                id: 'task-1',
                name: 'Task 1',
                description: null,
                completed: true,
                column_id: 'col-1',
                deadline: '2026-12-31',
                priority: 'high',
            });

        await updateTask(req, res);
        expect(db.updateTask).toHaveBeenCalledWith('task-1', {
            name: 'Task 1',
            description: null,
            completed: true,
            column_id: 'col-1',
            deadline: '2026-12-31',
            priority: 'high',
        });
        expect(res.send).toHaveBeenCalledWith({
            id: 'task-1',
            name: 'Task 1',
            description: null,
            completed: true,
            column_id: 'col-1',
            deadline: '2026-12-31',
            priority: 'high',
        });
    });

    test('it returns 404 when updating non-existent task', async () => {
        const req = { params: { id: 'task-unknown' }, body: { name: 'New' } };
        const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
        db.getTask.mockResolvedValue(null);

        await updateTask(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    test('it deletes a task', async () => {
        const req = { params: { id: 'task-1' } };
        const res = { sendStatus: jest.fn() };

        await deleteTask(req, res);
        expect(db.deleteTask).toHaveBeenCalledWith('task-1');
        expect(res.sendStatus).toHaveBeenCalledWith(200);
    });
});
