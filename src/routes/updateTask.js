const db = require('../database');

module.exports = async (req, res) => {
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
        };

        await db.updateTask(req.params.id, updated);
        const result = await db.getTask(req.params.id);
        res.send(result);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};
