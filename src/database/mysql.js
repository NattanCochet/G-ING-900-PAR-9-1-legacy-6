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
    const host = HOST_FILE ? fs.readFileSync(HOST_FILE) : HOST;
    const user = USER_FILE ? fs.readFileSync(USER_FILE) : USER;
    const password = PASSWORD_FILE ? fs.readFileSync(PASSWORD_FILE) : PASSWORD;
    const database = DB_FILE ? fs.readFileSync(DB_FILE) : DB;

    await waitPort({ 
        host, 
        port: 3306,
        timeout: 10000,
        waitForDns: true,
    });

    pool = mysql.createPool({
        connectionLimit: 5,
        host,
        user,
        password,
        database,
        charset: 'utf8mb4',
    });

    return new Promise((acc, rej) => {
        pool.query(
            queries.initTasksMysql,
            err => {
                if (err) return rej(err);

                pool.query(queries.alterTasksAddDeadlineMysql, () => {});
                pool.query(queries.alterTasksAddPriorityMysql, () => {});

                console.log(`Connected to mysql db at host ${HOST}`);
                acc();
            },
        );
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

async function getTasks(project_id) {
    return new Promise((acc, rej) => {
        const sql = project_id ? queries.getTasksByProject : queries.getAllTasks;
        const params = project_id ? [project_id] : [];
        pool.query(sql, params, (err, rows) => {
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
        pool.query(queries.getTaskById, [id], (err, rows) => {
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

async function updateTask(id, task) {
    return new Promise((acc, rej) => {
        pool.query(
            queries.updateTask,
            [task.name, task.description || null, task.completed ? 1 : 0, task.column_id || null, task.deadline || null, task.priority || null, id],
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

module.exports = {
    init,
    teardown,
    getTasks,
    getTask,
    createTask,
    updateTask,
    deleteTask,
};
