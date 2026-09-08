const db = require('../database');

/**
 * @openapi
 * /projects/{id}:
 *   put:
 *     summary: Update a project
 *     operationId: updateProject
 */
module.exports = async (req, res) => {
    try {
        const existing = await db.getProject(req.params.id);
        if (!existing) {
            return res.status(404).send({ error: 'Project not found' });
        }

        const updated = {
            name: req.body.name || existing.name,
            description: req.body.description !== undefined ? req.body.description : existing.description,
        };

        await db.updateProject(req.params.id, updated);
        const result = await db.getProject(req.params.id);
        res.send(result);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};
