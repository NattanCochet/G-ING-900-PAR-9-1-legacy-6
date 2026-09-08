const db = require('../database');

/**
 * @openapi
 * /projects/{id}:
 *   delete:
 *     summary: Delete a project
 *     operationId: deleteProject
 */
module.exports = async (req, res) => {
    try {
        await db.deleteProject(req.params.id);
        res.sendStatus(200);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};
