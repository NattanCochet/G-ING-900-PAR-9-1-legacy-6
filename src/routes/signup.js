const db = require('../database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');

module.exports = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).send({ error: 'name, email and password are required' });
        }

        const existing = await db.getUserByEmail(email);
        if (existing) {
            return res.status(409).send({ error: 'email already taken' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = { id: uuid(), name, email, password: hashedPassword };

        await db.createUser(user);

        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET || 'changeme',
            { expiresIn: '24h' }
        );

        return res.status(201).send({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
        if (typeof next === 'function') {
            next(err);
        } else {
            res.status(500).send({ error: 'internal server error' });
        }
    }
};