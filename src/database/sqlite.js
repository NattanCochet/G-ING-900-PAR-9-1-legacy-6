const sqlite3 = require('sqlite3').verbose();
const queries = require('./queries');
const fs = require('fs');
const path = require('path');
const location = process.env.SQLITE_DB_LOCATION || path.join(__dirname, '..', '..', '.local-data', 'todo.db');

let db;

function init() {
    const dirName = path.dirname(location);
    if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName, { recursive: true });
    }

    return new Promise((acc, rej) => {
        db = new sqlite3.Database(location, err => {
            if (err) return rej(err);

            if (process.env.NODE_ENV !== 'test')
                console.log(`Using sqlite database at ${location}`);

            db.serialize(() => {
                db.run(queries.initTableSqlite, err => { if (err) return rej(err); });
                db.run(queries.initUsersSqlite, err => {
                    if (err) return rej(err);
                    acc();
                });
            });
        });
    });
}

async function teardown() {
    return new Promise((acc, rej) => {
        db.close(err => {
            if (err) rej(err);
            else acc();
        });
    });
}

async function getItems() {
    return new Promise((acc, rej) => {
        db.all(queries.getItems, (err, rows) => {
            if (err) return rej(err);
            acc(
                rows.map(item =>
                    Object.assign({}, item, {
                        completed: item.completed === 1,
                    }),
                ),
            );
        });
    });
}

async function getItem(id) {
    return new Promise((acc, rej) => {
        db.all(queries.getItemById, [id], (err, rows) => {
            if (err) return rej(err);
            acc(
                rows.map(item =>
                    Object.assign({}, item, {
                        completed: item.completed === 1,
                    }),
                )[0],
            );
        });
    });
}

async function storeItem(item) {
    return new Promise((acc, rej) => {
        db.run(
            queries.insertItem,
            [item.id, item.name, item.completed ? 1 : 0],
            err => {
                if (err) return rej(err);
                acc();
            },
        );
    });
}

async function updateItem(id, item) {
    return new Promise((acc, rej) => {
        db.run(
            queries.updateItem,
            [item.name, item.completed ? 1 : 0, id],
            err => {
                if (err) return rej(err);
                acc();
            },
        );
    });
}

async function removeItem(id) {
    return new Promise((acc, rej) => {
        db.run(queries.deleteItem, [id], err => {
            if (err) return rej(err);
            acc();
        });
    });
}

async function createUser(user) {
    return new Promise((acc, rej) => {
        db.run(
            queries.createUser,
            [user.id, user.name, user.email, user.password],
            err => {
                if (err) return rej(err);
                acc();
            },
        );
    });
}

async function getUserByEmail(email) {
    return new Promise((acc, rej) => {
        db.all(queries.getUserByEmail, [email], (err, rows) => {
            if (err) return rej(err);
            acc(rows[0]);
        });
    });
}

async function getUserById(id) {
    return new Promise((acc, rej) => {
        db.all(queries.getUserById, [id], (err, rows) => {
            if (err) return rej(err);
            acc(rows[0]);
        });
    });
}

async function deleteUser(id) {
    return new Promise((acc, rej) => {
        db.run(queries.deleteUser, [id], err => {
            if (err) return rej(err);
            acc();
        });
    });
}

module.exports = {
    location,
    init,
    teardown,
    getItems,
    getItem,
    storeItem,
    updateItem,
    removeItem,
    createUser,
    getUserByEmail,
    getUserById,
    deleteUser,
};
