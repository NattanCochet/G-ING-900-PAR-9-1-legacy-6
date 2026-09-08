const db = require('../database');

module.exports = async (req, res) => {
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
        res.send(result);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};
