const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../database');
const { v4: uuid } = require('uuid');
const { eventBus, eventTypes } = require('../events');

/**
 * @openapi
 * /columns:
 *   post:
 *     summary: Create a column in a project
 *     operationId: addColumn
 */
const addColumn = async (req, res) => {
    try {
        const { name, description = null } = req.body;
        const project_id = req.body.project_id || req.params.projectId;

        if (!name) {
            return res.status(400).send({ error: 'name is required' });
        }
        if (!project_id) {
            return res.status(400).send({ error: 'project_id is required' });
        }

        const column = {
            id: uuid(),
            project_id,
            name,
            description,
        };

        await db.createColumn(column);
        eventBus.emit(eventTypes.COLUMN_CREATED, column);
        res.status(201).send(column);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

/**
 * @openapi
 * /columns:
 *   get:
 *     summary: Get all columns for a project (using query param)
 *     operationId: getColumnsQuery
 *     parameters:
 *       - name: project_id
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Project ID is required
 *       500:
 *         description: Internal server error
 * /projects/{projectId}/columns:
 *   get:
 *     summary: Get all columns for a project
 *     operationId: getColumns
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
const getColumns = async (req, res) => {
    try {
        const projectId = req.params.projectId || req.query.project_id;
        if (!projectId) {
            return res.status(400).send({ error: 'project_id is required' });
        }
        const columns = await db.getColumns(projectId);
        res.send(columns);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

/**
 * @openapi
 * /columns/{id}:
 *   get:
 *     summary: Get a column by ID
 *     operationId: getColumnById
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
 *         description: Column not found
 *       500:
 *         description: Internal server error
 */
const getColumnById = async (req, res) => {
    try {
        const column = await db.getColumn(req.params.id);
        if (!column) {
            return res.status(404).send({ error: 'Column not found' });
        }
        res.send(column);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

/**
 * @openapi
 * /columns/{id}:
 *   put:
 *     summary: Update a column
 *     operationId: updateColumn
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
 *     responses:
 *       200:
 *         description: Column updated successfully
 *       404:
 *         description: Column not found
 *       500:
 *         description: Internal server error
 */
const updateColumn = async (req, res) => {
    try {
        const existing = await db.getColumn(req.params.id);
        if (!existing) {
            return res.status(404).send({ error: 'Column not found' });
        }

        const updated = {
            name: req.body.name || existing.name,
            description: req.body.description !== undefined ? req.body.description : existing.description,
        };

        await db.updateColumn(req.params.id, updated);
        const result = await db.getColumn(req.params.id);
        eventBus.emit(eventTypes.COLUMN_UPDATED, result);
        res.send(result);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

/**
 * @openapi
 * /columns/{id}:
 *   delete:
 *     summary: Delete a column
 *     operationId: deleteColumn
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Column deleted successfully
 *       500:
 *         description: Internal server error
 */
const deleteColumn = async (req, res) => {
    try {
        await db.deleteColumn(req.params.id);
        eventBus.emit(eventTypes.COLUMN_DELETED, { id: req.params.id });
        res.sendStatus(200);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

router.get('/', getColumns);
router.post('/', addColumn);
router.get('/:id', getColumnById);
router.put('/:id', updateColumn);
router.delete('/:id', deleteColumn);

module.exports = router;
module.exports.addColumn = addColumn;
module.exports.getColumns = getColumns;
module.exports.getColumnById = getColumnById;
module.exports.updateColumn = updateColumn;
module.exports.deleteColumn = deleteColumn;
