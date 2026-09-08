const db = require('../database');

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
