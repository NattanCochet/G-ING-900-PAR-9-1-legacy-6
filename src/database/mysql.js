const waitPort = require('wait-port');
const fs = require('fs');
const mysql = require('mysql2');
const queries = require('./queries');

const {
    MYSQL_HOST: HOST,
    MYSQL_HOST_FILE: HOST_FILE,
    MYSQL_USER: USER,
    MYSQL_USER_FILE: USER_FILE,
    MYSQL_PASSWORD: PASSWORD,
    MYSQL_PASSWORD_FILE: PASSWORD_FILE,
    MYSQL_DB: DB,
    MYSQL_DB_FILE: DB_FILE,
} = process.env;

let pool;

async function init() {
    const host = process.env.MYSQL_HOST_FILE
        ? fs.readFileSync(process.env.MYSQL_HOST_FILE, 'utf8').trim()
        : (HOST_FILE ? fs.readFileSync(HOST_FILE, 'utf8').trim() : (process.env.MYSQL_HOST || process.env.MYSQLHOST || HOST));
    const user = process.env.MYSQL_USER_FILE
        ? fs.readFileSync(process.env.MYSQL_USER_FILE, 'utf8').trim()
        : (USER_FILE ? fs.readFileSync(USER_FILE, 'utf8').trim() : (process.env.MYSQL_USER || process.env.MYSQLUSER || USER));
    const password = process.env.MYSQL_PASSWORD_FILE
        ? fs.readFileSync(process.env.MYSQL_PASSWORD_FILE, 'utf8').trim()
        : (PASSWORD_FILE ? fs.readFileSync(PASSWORD_FILE, 'utf8').trim() : (process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD || PASSWORD));
    const database = process.env.MYSQL_DB_FILE
        ? fs.readFileSync(process.env.MYSQL_DB_FILE, 'utf8').trim()
        : (DB_FILE ? fs.readFileSync(DB_FILE, 'utf8').trim() : (process.env.MYSQL_DB || process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || DB));
    const port = parseInt(process.env.MYSQL_PORT || process.env.MYSQLPORT || '3306', 10);

    await waitPort({
        host,
        port,
        timeout: 30000,
        waitForDns: true,
    });

    pool = mysql.createPool({
        connectionLimit: 5,
        host,
        port,
        user,
        password,
        database,
        charset: 'utf8mb4',
        dateStrings: true,
    });

    return new Promise((acc, rej) => {
        pool.query(queries.initUsersMysql, err => {
            if (err) return rej(err);
            pool.query(queries.initProjectsMysql, err => {
                if (err) return rej(err);
                pool.query(queries.initColumnsMysql, err => {
                    if (err) return rej(err);
                    pool.query(queries.initTasksMysql, err => {
                        if (err) return rej(err);
                        pool.query(queries.alterTasksAddDeadlineMysql, () => {});
                        pool.query(queries.alterTasksAddPriorityMysql, () => {});
                        pool.query(queries.initTaskUsersMysql, err => {
                            if (err) return rej(err);
                            console.log(`Connected to mysql db at host ${host}`);
                            acc();
                        });
                    });
                });
            });
        });
    });
}

async function teardown() {
    return new Promise((acc, rej) => {
        pool.end(err => {
            if (err) rej(err);
            else acc();
        });
    });
}

async function createUser(user) {
    return new Promise((acc, rej) => {
        pool.query(
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
        pool.query(queries.getUserByEmail, [email], (err, rows) => {
            if (err) return rej(err);
            acc(rows && rows[0] ? rows[0] : undefined);
        });
    });
}

async function getUserById(id) {
    return new Promise((acc, rej) => {
        pool.query(queries.getUserById, [id], (err, rows) => {
            if (err) return rej(err);
            acc(rows && rows[0] ? rows[0] : undefined);
        });
    });
}

async function deleteUser(id) {
    return new Promise((acc, rej) => {
        pool.query(queries.deleteUser, [id], err => {
            if (err) return rej(err);
            acc();
        });
    });
}

async function createProject(project) {
    return new Promise((acc, rej) => {
        pool.query(
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
        pool.query(sql, params, (err, rows) => {
            if (err) return rej(err);
            acc(rows || []);
        });
    });
}

async function getProject(id) {
    return new Promise((acc, rej) => {
        pool.query(queries.getProjectById, [id], (err, rows) => {
            if (err) return rej(err);
            acc(rows && rows[0] ? rows[0] : undefined);
        });
    });
}

async function updateProject(id, project) {
    return new Promise((acc, rej) => {
        pool.query(
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
        pool.query(queries.deleteProject, [id], err => {
            if (err) return rej(err);
            acc();
        });
    });
}

async function createColumn(column) {
    return new Promise((acc, rej) => {
        pool.query(
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
        pool.query(queries.getColumnsByProject, [project_id], (err, rows) => {
            if (err) return rej(err);
            acc(rows || []);
        });
    });
}

async function getColumn(id) {
    return new Promise((acc, rej) => {
        pool.query(queries.getColumnById, [id], (err, rows) => {
            if (err) return rej(err);
            acc(rows && rows[0] ? rows[0] : undefined);
        });
    });
}

async function updateColumn(id, column) {
    return new Promise((acc, rej) => {
        pool.query(
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
        pool.query(queries.deleteColumn, [id], err => {
            if (err) return rej(err);
            acc();
        });
    });
}

async function createTask(task) {
    return new Promise((acc, rej) => {
        pool.query(
            queries.createTask,
            [
                task.id,
                task.project_id || null,
                task.column_id || null,
                task.creator_id || null,
                task.name,
                task.description || null,
                task.completed ? 1 : 0,
                task.deadline || null,
                task.priority || null,
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
        pool.query(sql, params, (err, rows) => {
            if (err) return rej(err);
            acc(
                (rows || []).map(task =>
                    Object.assign({}, task, {
                        completed: task.completed === 1 || task.completed === true,
                    }),
                ),
            );
        });
    });
}

async function getTasksByColumn(column_id) {
    return new Promise((acc, rej) => {
        pool.query(queries.getTasksByColumn, [column_id], (err, rows) => {
            if (err) return rej(err);
            acc(
                (rows || []).map(task =>
                    Object.assign({}, task, {
                        completed: task.completed === 1 || task.completed === true,
                    }),
                ),
            );
        });
    });
}

async function getTask(id) {
    return new Promise((acc, rej) => {
        pool.query(queries.getTaskById, [id], (err, rows) => {
            if (err) return rej(err);
            if (!rows || !rows[0]) return acc(undefined);
            acc(
                Object.assign({}, rows[0], {
                    completed: rows[0].completed === 1 || rows[0].completed === true,
                }),
            );
        });
    });
}

async function updateTask(id, task) {
    return new Promise((acc, rej) => {
        pool.query(
            queries.updateTask,
            [
                task.name,
                task.description || null,
                task.completed ? 1 : 0,
                task.column_id || null,
                task.deadline || null,
                task.priority || null,
                id,
            ],
            err => {
                if (err) return rej(err);
                acc();
            },
        );
    });
}

async function deleteTask(id) {
    return new Promise((acc, rej) => {
        pool.query(queries.deleteTask, [id], err => {
            if (err) return rej(err);
            acc();
        });
    });
}

async function assignUserToTask(taskId, userId) {
    return new Promise((acc, rej) => {
        pool.query(queries.assignUserToTaskMysql, [taskId, userId], err => {
            if (err) return rej(err);
            acc();
        });
    });
}

async function getTaskUsers(taskId) {
    return new Promise((acc, rej) => {
        pool.query(queries.getTaskUsers, [taskId], (err, rows) => {
            if (err) return rej(err);
            acc(rows || []);
        });
    });
}

module.exports = {
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
    assignUserToTask,
    getTaskUsers,
};
