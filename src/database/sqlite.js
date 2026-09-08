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
                db.run('PRAGMA foreign_keys = ON;', err => { if (err) return rej(err); });
                db.run(queries.initUsersSqlite, err => { if (err) return rej(err); });
                db.run(queries.initProjectsSqlite, err => { if (err) return rej(err); });
                db.run(queries.initColumnsSqlite, err => { if (err) return rej(err); });
                db.run(queries.initTasksSqlite, err => {
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

async function createProject(project) {
    return new Promise((acc, rej) => {
        db.run(
            queries.createProject,
            [project.id, project.creator_id, project.name, project.description || null],
            err => {
                if (err) return rej(err);
                acc();
            },
        );
    });
}

async function getProjects(creator_id) {
    return new Promise((acc, rej) => {
        const sql = creator_id ? queries.getProjectsByCreator : queries.getAllProjects;
        const params = creator_id ? [creator_id] : [];
        db.all(sql, params, (err, rows) => {
            if (err) return rej(err);
            acc(rows || []);
        });
    });
}

async function getProject(id) {
    return new Promise((acc, rej) => {
        db.all(queries.getProjectById, [id], (err, rows) => {
            if (err) return rej(err);
            acc(rows[0]);
        });
    });
}

async function updateProject(id, project) {
    return new Promise((acc, rej) => {
        db.run(
            queries.updateProject,
            [project.name, project.description || null, id],
            err => {
                if (err) return rej(err);
                acc();
            },
        );
    });
}

async function deleteProject(id) {
    return new Promise((acc, rej) => {
        db.run(queries.deleteProject, [id], err => {
            if (err) return rej(err);
            acc();
        });
    });
}

async function createColumn(column) {
    return new Promise((acc, rej) => {
        db.run(
            queries.createColumn,
            [column.id, column.project_id, column.name, column.description || null],
            err => {
                if (err) return rej(err);
                acc();
            },
        );
    });
}

async function getColumns(project_id) {
    return new Promise((acc, rej) => {
        db.all(queries.getColumnsByProject, [project_id], (err, rows) => {
            if (err) return rej(err);
            acc(rows || []);
        });
    });
}

async function getColumn(id) {
    return new Promise((acc, rej) => {
        db.all(queries.getColumnById, [id], (err, rows) => {
            if (err) return rej(err);
            acc(rows[0]);
        });
    });
}

async function updateColumn(id, column) {
    return new Promise((acc, rej) => {
        db.run(
            queries.updateColumn,
            [column.name, column.description || null, id],
            err => {
                if (err) return rej(err);
                acc();
            },
        );
    });
}

async function deleteColumn(id) {
    return new Promise((acc, rej) => {
        db.run(queries.deleteColumn, [id], err => {
            if (err) return rej(err);
            acc();
        });
    });
}

async function createTask(task) {
    return new Promise((acc, rej) => {
        db.run(
            queries.createTask,
            [
                task.id,
                task.project_id || null,
                task.column_id || null,
                task.creator_id || null,
                task.name,
                task.description || null,
                task.completed ? 1 : 0,
            ],
            err => {
                if (err) return rej(err);
                acc();
            },
        );
    });
}

async function getTasks(project_id) {
    return new Promise((acc, rej) => {
        const sql = project_id ? queries.getTasksByProject : queries.getAllTasks;
        const params = project_id ? [project_id] : [];
        db.all(sql, params, (err, rows) => {
            if (err) return rej(err);
            acc(
                (rows || []).map(task =>
                    Object.assign({}, task, {
                        completed: task.completed === 1,
                    }),
                ),
            );
        });
    });
}

async function getTasksByColumn(column_id) {
    return new Promise((acc, rej) => {
        db.all(queries.getTasksByColumn, [column_id], (err, rows) => {
            if (err) return rej(err);
            acc(
                (rows || []).map(task =>
                    Object.assign({}, task, {
                        completed: task.completed === 1,
                    }),
                ),
            );
        });
    });
}

async function getTask(id) {
    return new Promise((acc, rej) => {
        db.all(queries.getTaskById, [id], (err, rows) => {
            if (err) return rej(err);
            if (!rows || !rows[0]) return acc(undefined);
            acc(
                Object.assign({}, rows[0], {
                    completed: rows[0].completed === 1,
                }),
            );
        });
    });
}

async function updateTask(id, task) {
    return new Promise((acc, rej) => {
        db.run(
            queries.updateTask,
            [task.name, task.description || null, task.completed ? 1 : 0, task.column_id || null, id],
            err => {
                if (err) return rej(err);
                acc();
            },
        );
    });
}

async function deleteTask(id) {
    return new Promise((acc, rej) => {
        db.run(queries.deleteTask, [id], err => {
            if (err) return rej(err);
            acc();
        });
    });
}

module.exports = {
    location,
    init,
    teardown,
    createUser,
    getUserByEmail,
    getUserById,
    deleteUser,
    createProject,
    getProjects,
    getProject,
    updateProject,
    deleteProject,
    createColumn,
    getColumns,
    getColumn,
    updateColumn,
    deleteColumn,
    createTask,
    getTasks,
    getTasksByColumn,
    getTask,
    updateTask,
    deleteTask,
};
