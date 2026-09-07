const db = require('../database');

module.exports = async (req, res) => {
    try {
        if (req.user && req.user.id !== req.params.id) {
            return res.sendStatus(403);
        }

        await db.deleteUser(req.params.id);
        res.sendStatus(200);
    } catch {
        res.sendStatus(500);
    }
};