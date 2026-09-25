// Contract tests for the domain-events pub/sub boundary between routes (producers)
// and listeners (consumers) - see src/events/contracts.js for the shared schemas and
// docs/adr/0013-event-contract-testing.md for the rationale.
const nodemailer = require('nodemailer');
const { v4: uuid } = require('uuid');

const db = require('../../src/database');
const { eventBus, eventTypes } = require('../../src/events');
const { validateEventPayload, getExamplePayload, schemas } = require('../../src/events/contracts');
const registerAuditLogger = require('../../src/events/listeners/auditLogger');
const registerMailNotifier = require('../../src/events/listeners/mailNotifier');

jest.mock('../../src/database', () => ({
    getUserByEmail: jest.fn(),
    createUser: jest.fn(),
    deleteUser: jest.fn(),

    createProject: jest.fn(),
    getProject: jest.fn(),
    updateProject: jest.fn(),
    deleteProject: jest.fn(),

    createColumn: jest.fn(),
    getColumn: jest.fn(),
    updateColumn: jest.fn(),
    deleteColumn: jest.fn(),

    createTask: jest.fn(),
    getTask: jest.fn(),
    updateTask: jest.fn(),
    deleteTask: jest.fn(),
}));
jest.mock('uuid', () => ({ v4: jest.fn() }));
jest.mock('bcryptjs', () => ({ hash: jest.fn().mockResolvedValue('hashed') }));
jest.mock('jsonwebtoken', () => ({ sign: jest.fn().mockReturnValue('token') }));
jest.mock('nodemailer');

const { signup, deleteUser } = require('../../src/routes/auth');
const { addProject, updateProject, deleteProject } = require('../../src/routes/projects');
const { addColumn, updateColumn, deleteColumn } = require('../../src/routes/columns');
const { addTask, updateTask, deleteTask } = require('../../src/routes/tasks');

const res = () => ({ status: jest.fn().mockReturnThis(), send: jest.fn(), sendStatus: jest.fn() });

// Captures the payload of the next occurrence of `event` emitted on the real, shared eventBus.
function nextEmittedPayload(event) {
    return new Promise((resolve) => eventBus.once(event, resolve));
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe('Producer contracts (routes -> eventBus)', () => {
    test('signup emits a USER_CREATED payload matching the contract', async () => {
        uuid.mockReturnValue('user-1');
        db.getUserByEmail.mockResolvedValue(undefined);
        const captured = nextEmittedPayload(eventTypes.USER_CREATED);

        await signup({ body: { name: 'Alice', email: 'alice@example.com', password: 'secret' } }, res());

        expect(validateEventPayload(eventTypes.USER_CREATED, await captured)).toEqual({ valid: true, errors: null });
    });

    test('deleteUser emits a USER_DELETED payload matching the contract', async () => {
        const captured = nextEmittedPayload(eventTypes.USER_DELETED);

        await deleteUser({ params: { id: 'user-1' }, user: { id: 'user-1' } }, res());

        expect(validateEventPayload(eventTypes.USER_DELETED, await captured)).toEqual({ valid: true, errors: null });
    });

    test('addProject emits a PROJECT_CREATED payload matching the contract', async () => {
        uuid.mockReturnValue('proj-1');
        const captured = nextEmittedPayload(eventTypes.PROJECT_CREATED);

        await addProject({ body: { name: 'Project', description: 'Desc' }, user: { id: 'user-1' } }, res());

        expect(validateEventPayload(eventTypes.PROJECT_CREATED, await captured)).toEqual({ valid: true, errors: null });
    });

    test('updateProject emits a PROJECT_UPDATED payload matching the contract', async () => {
        db.getProject
            .mockResolvedValueOnce({ id: 'proj-1', creator_id: 'user-1', name: 'Project', description: 'Desc' })
            .mockResolvedValueOnce({ id: 'proj-1', creator_id: 'user-1', name: 'Renamed', description: 'Desc' });
        const captured = nextEmittedPayload(eventTypes.PROJECT_UPDATED);

        await updateProject({ params: { id: 'proj-1' }, body: { name: 'Renamed' } }, res());

        expect(validateEventPayload(eventTypes.PROJECT_UPDATED, await captured)).toEqual({ valid: true, errors: null });
    });

    test('deleteProject emits a PROJECT_DELETED payload matching the contract', async () => {
        const captured = nextEmittedPayload(eventTypes.PROJECT_DELETED);

        await deleteProject({ params: { id: 'proj-1' } }, res());

        expect(validateEventPayload(eventTypes.PROJECT_DELETED, await captured)).toEqual({ valid: true, errors: null });
    });

    test('addColumn emits a COLUMN_CREATED payload matching the contract', async () => {
        uuid.mockReturnValue('col-1');
        const captured = nextEmittedPayload(eventTypes.COLUMN_CREATED);

        await addColumn({ body: { name: 'Todo', project_id: 'proj-1' } }, res());

        expect(validateEventPayload(eventTypes.COLUMN_CREATED, await captured)).toEqual({ valid: true, errors: null });
    });

    test('updateColumn emits a COLUMN_UPDATED payload matching the contract', async () => {
        db.getColumn
            .mockResolvedValueOnce({ id: 'col-1', project_id: 'proj-1', name: 'Todo', description: null })
            .mockResolvedValueOnce({ id: 'col-1', project_id: 'proj-1', name: 'Doing', description: null });
        const captured = nextEmittedPayload(eventTypes.COLUMN_UPDATED);

        await updateColumn({ params: { id: 'col-1' }, body: { name: 'Doing' } }, res());

        expect(validateEventPayload(eventTypes.COLUMN_UPDATED, await captured)).toEqual({ valid: true, errors: null });
    });

    test('deleteColumn emits a COLUMN_DELETED payload matching the contract', async () => {
        const captured = nextEmittedPayload(eventTypes.COLUMN_DELETED);

        await deleteColumn({ params: { id: 'col-1' } }, res());

        expect(validateEventPayload(eventTypes.COLUMN_DELETED, await captured)).toEqual({ valid: true, errors: null });
    });

    test('addTask emits a TASK_CREATED payload matching the contract', async () => {
        uuid.mockReturnValue('task-1');
        const captured = nextEmittedPayload(eventTypes.TASK_CREATED);

        await addTask({
            body: { name: 'Task', project_id: 'proj-1', column_id: 'col-1' },
            params: {},
            user: { id: 'user-1' },
        }, res());

        expect(validateEventPayload(eventTypes.TASK_CREATED, await captured)).toEqual({ valid: true, errors: null });
    });

    test('updateTask emits a TASK_UPDATED payload matching the contract', async () => {
        db.getTask
            .mockResolvedValueOnce({
                id: 'task-1', project_id: 'proj-1', column_id: 'col-1', creator_id: 'user-1',
                name: 'Task', description: null, completed: false, deadline: null, priority: null,
            })
            .mockResolvedValueOnce({
                id: 'task-1', project_id: 'proj-1', column_id: 'col-1', creator_id: 'user-1',
                name: 'Task', description: null, completed: true, deadline: '2026-12-31', priority: 'high',
            });
        const captured = nextEmittedPayload(eventTypes.TASK_UPDATED);

        await updateTask({ params: { id: 'task-1' }, body: { completed: true, deadline: '2026-12-31', priority: 'high' } }, res());

        expect(validateEventPayload(eventTypes.TASK_UPDATED, await captured)).toEqual({ valid: true, errors: null });
    });

    test('deleteTask emits a TASK_DELETED payload matching the contract', async () => {
        const captured = nextEmittedPayload(eventTypes.TASK_DELETED);

        await deleteTask({ params: { id: 'task-1' } }, res());

        expect(validateEventPayload(eventTypes.TASK_DELETED, await captured)).toEqual({ valid: true, errors: null });
    });
});

describe('Consumer contracts (eventBus -> listeners)', () => {
    beforeEach(() => {
        eventBus.removeAllListeners();
        nodemailer.createTransport.mockReturnValue({ sendMail: jest.fn().mockResolvedValue({ messageId: 'id' }) });
        nodemailer.createTestAccount.mockResolvedValue({ user: 'u', pass: 'p' });
    });

    test.each(Object.keys(schemas))('auditLogger handles a contract-valid "%s" payload without throwing', async (event) => {
        registerAuditLogger();
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        expect(() => eventBus.emit(event, getExamplePayload(event))).not.toThrow();

        logSpy.mockRestore();
    });

    test('mailNotifier sends a welcome email for a contract-valid USER_CREATED payload', async () => {
        await registerMailNotifier();
        const { sendMail } = nodemailer.createTransport.mock.results[0].value;

        eventBus.emit(eventTypes.USER_CREATED, getExamplePayload(eventTypes.USER_CREATED));
        await new Promise(setImmediate);

        expect(sendMail).toHaveBeenCalledTimes(1);
    });
});
