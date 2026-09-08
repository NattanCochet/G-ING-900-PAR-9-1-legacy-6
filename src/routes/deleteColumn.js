const db = require('../database');

module.exports = async (req, res) => {
    try {
        await db.deleteColumn(req.params.id);
        res.sendStatus(200);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};
