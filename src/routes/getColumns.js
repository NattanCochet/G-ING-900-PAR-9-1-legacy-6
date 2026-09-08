const db = require('../database');

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

module.exports = {
    getColumns,
    getColumnById,
};
