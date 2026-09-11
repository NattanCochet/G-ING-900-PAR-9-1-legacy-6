const db = require('../database');
const { v4: uuid } = require('uuid');
const { eventBus, eventTypes } = require('../events');

/**
 * @openapi
 * /tasks:
 *   post:
 *     summary: Create a task
 *     operationId: addTask
 */
module.exports = async (req, res) => {
    try {
        const { name, description = null, completed = false } = req.body;
        const project_id = req.body.project_id || req.params.projectId || null;
        const column_id = req.body.column_id || null;
        const creator_id = req.user ? req.user.id : (req.body.creator_id || null);

        if (!name) {
            return res.status(400).send({ error: 'name is required' });
        }

        const task = {
            id: uuid(),
            project_id,
            column_id,
            creator_id,
            name,
            description,
            completed,
        };

        await db.createTask(task);
        eventBus.emit(eventTypes.TASK_CREATED, task);
        res.status(201).send(task);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};
