// The contract shared by producers (routes emitting domain events) and consumers
// (listeners in ./listeners): a JSON Schema per event type, plus one example payload
// that satisfies it. Producers and consumers are tested against these in
// spec/tests/eventsContract.spec.js so either side can change independently as long
// as the payload it emits/expects still matches the schema here.
const Ajv = require('ajv');
const eventTypes = require('./eventTypes');

const ajv = new Ajv({ allErrors: true });

const idProp = { type: 'string', minLength: 1 };
const nullableString = { type: ['string', 'null'] };

const schemas = {
    [eventTypes.USER_CREATED]: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'name', 'email'],
        properties: {
            id: idProp,
            name: { type: 'string' },
            email: { type: 'string' },
        },
    },
    [eventTypes.USER_DELETED]: {
        type: 'object',
        additionalProperties: false,
        required: ['id'],
        properties: { id: idProp },
    },

    [eventTypes.PROJECT_CREATED]: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'creator_id', 'name', 'description'],
        properties: {
            id: idProp,
            creator_id: idProp,
            name: { type: 'string' },
            description: nullableString,
        },
    },
    [eventTypes.PROJECT_DELETED]: {
        type: 'object',
        additionalProperties: false,
        required: ['id'],
        properties: { id: idProp },
    },

    [eventTypes.COLUMN_CREATED]: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'project_id', 'name', 'description'],
        properties: {
            id: idProp,
            project_id: idProp,
            name: { type: 'string' },
            description: nullableString,
        },
    },
    [eventTypes.COLUMN_DELETED]: {
        type: 'object',
        additionalProperties: false,
        required: ['id'],
        properties: { id: idProp },
    },

    [eventTypes.TASK_CREATED]: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'project_id', 'column_id', 'creator_id', 'name', 'description', 'completed', 'deadline', 'priority'],
        properties: {
            id: idProp,
            project_id: nullableString,
            column_id: nullableString,
            creator_id: nullableString,
            name: { type: 'string' },
            description: nullableString,
            completed: { type: 'boolean' },
            deadline: nullableString,
            priority: nullableString,
        },
    },
    [eventTypes.TASK_DELETED]: {
        type: 'object',
        additionalProperties: false,
        required: ['id'],
        properties: { id: idProp },
    },
};

// PROJECT_UPDATED/COLUMN_UPDATED/TASK_UPDATED re-emit the same shape as their *_CREATED counterpart.
schemas[eventTypes.PROJECT_UPDATED] = schemas[eventTypes.PROJECT_CREATED];
schemas[eventTypes.COLUMN_UPDATED] = schemas[eventTypes.COLUMN_CREATED];
schemas[eventTypes.TASK_UPDATED] = schemas[eventTypes.TASK_CREATED];

const validators = Object.fromEntries(
    Object.entries(schemas).map(([event, schema]) => [event, ajv.compile(schema)]),
);

// One example payload per event, valid against its own schema above - reused as a
// fixture by both producer and consumer contract tests.
const examples = {
    [eventTypes.USER_CREATED]: { id: 'user-1', name: 'Alice', email: 'alice@example.com' },
    [eventTypes.USER_DELETED]: { id: 'user-1' },
    [eventTypes.PROJECT_CREATED]: { id: 'proj-1', creator_id: 'user-1', name: 'Project', description: null },
    [eventTypes.PROJECT_UPDATED]: { id: 'proj-1', creator_id: 'user-1', name: 'Project', description: 'Updated' },
    [eventTypes.PROJECT_DELETED]: { id: 'proj-1' },
    [eventTypes.COLUMN_CREATED]: { id: 'col-1', project_id: 'proj-1', name: 'Todo', description: null },
    [eventTypes.COLUMN_UPDATED]: { id: 'col-1', project_id: 'proj-1', name: 'Todo', description: 'Updated' },
    [eventTypes.COLUMN_DELETED]: { id: 'col-1' },
    [eventTypes.TASK_CREATED]: {
        id: 'task-1', project_id: 'proj-1', column_id: 'col-1', creator_id: 'user-1',
        name: 'Task', description: null, completed: false, deadline: null, priority: null,
    },
    [eventTypes.TASK_UPDATED]: {
        id: 'task-1', project_id: 'proj-1', column_id: 'col-1', creator_id: 'user-1',
        name: 'Task', description: 'Updated', completed: true, deadline: '2026-12-31', priority: 'high',
    },
    [eventTypes.TASK_DELETED]: { id: 'task-1' },
};

// Unknown event types have no contract to enforce (treated as valid, nothing to check against).
function validateEventPayload(event, payload) {
    const validate = validators[event];
    if (!validate) {
        return { valid: true, errors: null };
    }
    const valid = validate(payload);
    return { valid, errors: valid ? null : validate.errors };
}

function getExamplePayload(event) {
    return examples[event];
}

module.exports = { validateEventPayload, getExamplePayload, schemas };
