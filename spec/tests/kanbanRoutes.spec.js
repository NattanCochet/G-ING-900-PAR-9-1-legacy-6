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
            body: { name: 'Nouvelle tache', project_id: 'proj-1', column_id: 'col-1' },
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
        });
        expect(res.status).toHaveBeenCalledWith(201);
    });

    test('it deletes a task', async () => {
        const req = { params: { id: 'task-1' } };
        const res = { sendStatus: jest.fn() };

        await deleteTask(req, res);
        expect(db.deleteTask).toHaveBeenCalledWith('task-1');
        expect(res.sendStatus).toHaveBeenCalledWith(200);
    });
});
