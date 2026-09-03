const db = require('../database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');

module.exports = async (req, res, next) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).send({ error: 'username and password are required' });
        }

        const existing = await db.getUserByUsername(username);
        if (existing) {
            return res.status(409).send({ error: 'username already taken' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = { id: uuid(), username, password: hashedPassword };

        await db.createUser(user);

        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET || 'changeme',
            { expiresIn: '24h' }
        );

        return res.status(201).send({ token, user: { id: user.id, username: user.username } });
    } catch (err) {
        if (typeof next === 'function') {
            next(err);
        } else {
            res.status(500).send({ error: 'internal server error' });
        }
    }
};