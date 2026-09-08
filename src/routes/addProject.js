const db = require('../database');
const { v4: uuid } = require('uuid');

/**
 * @openapi
 * /projects:
 *   post:
 *     summary: Create a new project
 *     operationId: addProject
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Project created
 */
module.exports = async (req, res) => {
    try {
        const { name, description = null } = req.body;
        const creator_id = req.user ? req.user.id : req.body.creator_id;

        if (!name) {
            return res.status(400).send({ error: 'name is required' });
        }
        if (!creator_id) {
            return res.status(400).send({ error: 'creator_id is required' });
        }

        const project = {
            id: uuid(),
            creator_id,
            name,
            description,
        };

        await db.createProject(project);
        res.status(201).send(project);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};
