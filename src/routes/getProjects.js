const db = require('../database');

/**
 * @openapi
 * /projects:
 *   get:
 *     summary: Get all projects (or current user projects)
 *     operationId: getProjects
 */
const getProjects = async (req, res) => {
    try {
        const creator_id = req.user ? req.user.id : req.query.creator_id;
        const projects = await db.getProjects(creator_id);
        res.send(projects);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

const getProjectById = async (req, res) => {
    try {
        const project = await db.getProject(req.params.id);
        if (!project) {
            return res.status(404).send({ error: 'Project not found' });
        }
        res.send(project);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

module.exports = {
    getProjects,
    getProjectById,
};
