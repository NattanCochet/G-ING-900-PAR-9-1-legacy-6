const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const mysql = require('mysql2/promise');
const waitPort = require('wait-port');

const sqliteLocation = process.env.SQLITE_DB_LOCATION || path.join(__dirname, '..', '..', '.local-data', 'todo.db');
const metaPath = path.join(path.dirname(sqliteLocation), '.last_active_db');

function getMysqlConfig() {
    const host = process.env.MYSQL_HOST_FILE
        ? fs.readFileSync(process.env.MYSQL_HOST_FILE, 'utf8').trim()
        : (process.env.MYSQL_HOST || process.env.MYSQLHOST);
    const user = process.env.MYSQL_USER_FILE
        ? fs.readFileSync(process.env.MYSQL_USER_FILE, 'utf8').trim()
        : (process.env.MYSQL_USER || process.env.MYSQLUSER);
    const password = process.env.MYSQL_PASSWORD_FILE
        ? fs.readFileSync(process.env.MYSQL_PASSWORD_FILE, 'utf8').trim()
        : (process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD);
    const database = process.env.MYSQL_DB_FILE
        ? fs.readFileSync(process.env.MYSQL_DB_FILE, 'utf8').trim()
        : (process.env.MYSQL_DB || process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE);
    const port = parseInt(process.env.MYSQL_PORT || process.env.MYSQLPORT || '3306', 10);

    if (!host) return null;

    return {
        host,
        port,
        user,
        password,
        database,
        connectTimeout: 10000,
        dateStrings: true,
    };
}

function getLastActiveDriver() {
    try {
        if (fs.existsSync(metaPath)) {
            return fs.readFileSync(metaPath, 'utf8').trim();
        }
    } catch {
        // ignore
    }
    return null;
}

function setLastActiveDriver(driver) {
    try {
        const dir = path.dirname(metaPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(metaPath, driver, 'utf8');
    } catch {
        // ignore
    }
}

function openSqlite() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(sqliteLocation, err => {
            if (err) reject(err);
            else resolve(db);
        });
    });
}

function querySqlite(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

function runSqlite(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, err => {
            if (err) reject(err);
            else resolve();
        });
    });
}

async function migrateSqliteToMysql() {
    if (!fs.existsSync(sqliteLocation)) return;

    const mysqlConfig = getMysqlConfig();
    if (!mysqlConfig) return;

    let sqliteDb;
    let mysqlConn;
    try {
        await waitPort({
            host: mysqlConfig.host,
            port: mysqlConfig.port,
            timeout: 30000,
            waitForDns: true,
        });

        sqliteDb = await openSqlite();
        const users = await querySqlite(sqliteDb, 'SELECT * FROM users');
        if (users.length === 0) {
            return;
        }

        const projects = await querySqlite(sqliteDb, 'SELECT * FROM projects');
        const columns = await querySqlite(sqliteDb, 'SELECT * FROM columns');
        const tasks = await querySqlite(sqliteDb, 'SELECT * FROM tasks');
        const taskUsers = await querySqlite(sqliteDb, 'SELECT * FROM task_users');

        mysqlConn = await mysql.createConnection(mysqlConfig);

        await mysqlConn.query('SET FOREIGN_KEY_CHECKS = 0');
        await mysqlConn.query('DELETE FROM task_users');
        await mysqlConn.query('DELETE FROM tasks');
        await mysqlConn.query('DELETE FROM columns');
        await mysqlConn.query('DELETE FROM projects');
        await mysqlConn.query('DELETE FROM users');

        for (const u of users) {
            await mysqlConn.query('INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)', [
                u.id,
                u.name,
                u.email,
                u.password,
            ]);
        }
        for (const p of projects) {
            await mysqlConn.query('INSERT INTO projects (id, creator_id, name, description) VALUES (?, ?, ?, ?)', [
                p.id,
                p.creator_id,
                p.name,
                p.description,
            ]);
        }
        for (const c of columns) {
            await mysqlConn.query('INSERT INTO columns (id, project_id, name, description) VALUES (?, ?, ?, ?)', [
                c.id,
                c.project_id,
                c.name,
                c.description,
            ]);
        }
        for (const t of tasks) {
            await mysqlConn.query(
                'INSERT INTO tasks (id, project_id, column_id, creator_id, name, description, completed, deadline, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [t.id, t.project_id, t.column_id, t.creator_id, t.name, t.description, t.completed ? 1 : 0, t.deadline, t.priority],
            );
        }
        for (const tu of taskUsers) {
            await mysqlConn.query('INSERT IGNORE INTO task_users (task_id, user_id) VALUES (?, ?)', [
                tu.task_id,
                tu.user_id,
            ]);
        }

        await mysqlConn.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log(`[Migration] Migrated data from SQLite to MySQL (${users.length} users, ${projects.length} projects, ${columns.length} columns, ${tasks.length} tasks).`);
    } catch (err) {
        console.error('[Migration] Failed migrating SQLite to MySQL:', err.message);
    } finally {
        if (sqliteDb) sqliteDb.close();
        if (mysqlConn) await mysqlConn.end().catch(() => {});
    }
}

async function migrateMysqlToSqlite() {
    const mysqlConfig = getMysqlConfig();
    if (!mysqlConfig) return;

    let sqliteDb;
    let mysqlConn;
    try {
        await waitPort({
            host: mysqlConfig.host,
            port: mysqlConfig.port,
            timeout: 30000,
            waitForDns: true,
        });

        mysqlConn = await mysql.createConnection(mysqlConfig);
        const [users] = await mysqlConn.query('SELECT * FROM users');
        if (!users || users.length === 0) {
            return;
        }

        const [projects] = await mysqlConn.query('SELECT * FROM projects');
        const [columns] = await mysqlConn.query('SELECT * FROM columns');
        const [tasks] = await mysqlConn.query('SELECT * FROM tasks');
        const [taskUsers] = await mysqlConn.query('SELECT * FROM task_users');

        sqliteDb = await openSqlite();

        await runSqlite(sqliteDb, 'PRAGMA foreign_keys = OFF');
        await runSqlite(sqliteDb, 'DELETE FROM task_users');
        await runSqlite(sqliteDb, 'DELETE FROM tasks');
        await runSqlite(sqliteDb, 'DELETE FROM columns');
        await runSqlite(sqliteDb, 'DELETE FROM projects');
        await runSqlite(sqliteDb, 'DELETE FROM users');

        for (const u of users) {
            await runSqlite(sqliteDb, 'INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)', [
                u.id,
                u.name,
                u.email,
                u.password,
            ]);
        }
        for (const p of projects) {
            await runSqlite(sqliteDb, 'INSERT INTO projects (id, creator_id, name, description) VALUES (?, ?, ?, ?)', [
                p.id,
                p.creator_id,
                p.name,
                p.description,
            ]);
        }
        for (const c of columns) {
            await runSqlite(sqliteDb, 'INSERT INTO columns (id, project_id, name, description) VALUES (?, ?, ?, ?)', [
                c.id,
                c.project_id,
                c.name,
                c.description,
            ]);
        }
        for (const t of tasks) {
            await runSqlite(
                sqliteDb,
                'INSERT INTO tasks (id, project_id, column_id, creator_id, name, description, completed, deadline, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [t.id, t.project_id, t.column_id, t.creator_id, t.name, t.description, t.completed ? 1 : 0, t.deadline, t.priority],
            );
        }
        for (const tu of taskUsers) {
            await runSqlite(sqliteDb, 'INSERT OR IGNORE INTO task_users (task_id, user_id) VALUES (?, ?)', [
                tu.task_id,
                tu.user_id,
            ]);
        }

        await runSqlite(sqliteDb, 'PRAGMA foreign_keys = ON');
        console.log(`[Migration] Migrated data from MySQL to SQLite (${users.length} users, ${projects.length} projects, ${columns.length} columns, ${tasks.length} tasks).`);
    } catch (err) {
        console.error('[Migration] Failed migrating MySQL to SQLite:', err.message);
    } finally {
        if (mysqlConn) await mysqlConn.end().catch(() => {});
        if (sqliteDb) sqliteDb.close();
    }
}

async function syncOnStartup(activeDriver) {
    if (process.env.NODE_ENV === 'test' && !process.env.ENABLE_TEST_MIGRATION) {
        return;
    }

    const lastDriver = getLastActiveDriver();

    if (activeDriver === 'mysql') {
        if (lastDriver === 'sqlite' || (!lastDriver && fs.existsSync(sqliteLocation))) {
            await migrateSqliteToMysql();
        }
        setLastActiveDriver('mysql');
    } else {
        if (lastDriver === 'mysql') {
            await migrateMysqlToSqlite();
        }
        setLastActiveDriver('sqlite');
    }
}

module.exports = {
    migrateSqliteToMysql,
    migrateMysqlToSqlite,
    syncOnStartup,
    getLastActiveDriver,
    setLastActiveDriver,
};
