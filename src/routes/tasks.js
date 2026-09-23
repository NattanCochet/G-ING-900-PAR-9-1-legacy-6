const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../database');
const { v4: uuid } = require('uuid');
const { eventBus, eventTypes } = require('../events');

/**
 * @openapi
 * /tasks:
 *   post:
 *     summary: Create a task
 *     tags: [Tasks]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               completed:
 *                 type: boolean
 *               project_id:
 *                 type: string
 *               column_id:
 *                 type: string
 *               deadline:
 *                 type: string
 *                 format: date
 *               priority:
 *                 type: string
 */
const addTask = async (req, res) => {
    try {
        const { name, description = null, completed = false, deadline = null, priority = null } = req.body;
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
            deadline,
            priority,
        };

        await db.createTask(task);
        eventBus.emit(eventTypes.TASK_CREATED, task);
        res.status(201).send(task);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

/**
 * @openapi
 * /tasks:
 *   get:
 *     summary: Get tasks (optionally by column_id or project_id)
 *     operationId: getTasksQuery
 *     tags: [Tasks]
 *     parameters:
 *       - name: project_id
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *       - name: column_id
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 *       500:
 *         description: Internal server error
 * /projects/{projectId}/tasks:
 *   get:
 *     summary: Get tasks for a project
 *     operationId: getTasks
 *     tags: [Tasks]
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 *       500:
 *         description: Internal server error
 */
const getTasks = async (req, res) => {
    try {
        const projectId = req.params.projectId || req.query.project_id;
        const columnId = req.query.column_id;

        if (columnId) {
            const tasks = await db.getTasksByColumn(columnId);
            return res.send(tasks);
        }

        const tasks = await db.getTasks(projectId);
        res.send(tasks);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

/**
 * @openapi
 * /tasks/{id}:
 *   get:
 *     summary: Get a task by ID
 *     operationId: getTaskById
 *     tags: [Tasks]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 *       404:
 *         description: Task not found
 *       500:
 *         description: Internal server error
 */
const getTaskById = async (req, res) => {
    try {
        const task = await db.getTask(req.params.id);
        if (!task) {
            return res.status(404).send({ error: 'Task not found' });
        }
        res.send(task);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

/**
 * @openapi
 * /tasks/{id}:
 *   put:
 *     summary: Update a task
 *     operationId: updateTask
 *     tags: [Tasks]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               completed:
 *                 type: boolean
 *               column_id:
 *                 type: string
 *               deadline:
 *                 type: string
 *                 format: date
 *               priority:
 *                 type: string
 *     responses:
 *       200:
 *         description: Task updated successfully
 *       404:
 *         description: Task not found
 *       500:
 *         description: Internal server error
 */
const updateTask = async (req, res) => {
    try {
        const existing = await db.getTask(req.params.id);
        if (!existing) {
            return res.status(404).send({ error: 'Task not found' });
        }

        const updated = {
            name: req.body.name || existing.name,
            description: req.body.description !== undefined ? req.body.description : existing.description,
            completed: req.body.completed !== undefined ? req.body.completed : existing.completed,
            column_id: req.body.column_id || existing.column_id,
            deadline: req.body.deadline !== undefined ? req.body.deadline : existing.deadline,
            priority: req.body.priority !== undefined ? req.body.priority : existing.priority,
        };

        await db.updateTask(req.params.id, updated);
        const result = await db.getTask(req.params.id);
        eventBus.emit(eventTypes.TASK_UPDATED, result);
        res.send(result);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

/**
 * @openapi
 * /tasks/{id}:
 *   delete:
 *     summary: Delete a task
 *     operationId: deleteTask
 *     tags: [Tasks]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *       500:
 *         description: Internal server error
 */
const deleteTask = async (req, res) => {
    try {
        await db.deleteTask(req.params.id);
        eventBus.emit(eventTypes.TASK_DELETED, { id: req.params.id });
        res.sendStatus(200);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

router.get('/', getTasks);
router.post('/', addTask);
router.get('/:id', getTaskById);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

module.exports = router;
module.exports.addTask = addTask;
module.exports.getTasks = getTasks;
module.exports.getTaskById = getTaskById;
module.exports.updateTask = updateTask;
module.exports.deleteTask = deleteTask;
