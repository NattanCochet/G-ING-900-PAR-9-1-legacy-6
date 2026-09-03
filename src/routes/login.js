const db = require('../database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).send({ error: 'username and password are required' });
        }

        const user = await db.getUserByUsername(username);
        if (!user) {
            return res.status(401).send({ error: 'invalid credentials' });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).send({ error: 'invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET || 'changeme',
            { expiresIn: '24h' }
        );

        return res.send({ token, user: { id: user.id, username: user.username } });
    } catch (err) {
        if (typeof next === 'function') {
            next(err);
        } else {
            res.status(500).send({ error: 'internal server error' });
        }
    }
};