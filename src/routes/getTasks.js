const db = require('../database');

/**
 * @openapi
 * /tasks:
 *   get:
 *     summary: Get tasks (optionally by column_id or project_id)
 *     operationId: getTasksQuery
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

module.exports = {
    getTasks,
    getTaskById,
};
