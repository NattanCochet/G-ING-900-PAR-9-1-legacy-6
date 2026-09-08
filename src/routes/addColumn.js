const db = require('../database');
const { v4: uuid } = require('uuid');

/**
 * @openapi
 * /columns:
 *   post:
 *     summary: Create a column in a project
 *     operationId: addColumn
 */
module.exports = async (req, res) => {
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
        res.status(201).send(column);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};
