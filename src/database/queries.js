module.exports = {
    // Users
    initUsersSqlite: 'CREATE TABLE IF NOT EXISTS users (id varchar(36) PRIMARY KEY, name varchar(255), email varchar(255) UNIQUE, password varchar(255))',
    initUsersMysql: 'CREATE TABLE IF NOT EXISTS users (id varchar(36) PRIMARY KEY, name varchar(255), email varchar(255) UNIQUE, password varchar(255)) DEFAULT CHARSET utf8mb4',
    createUser: 'INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)',
    getUserByEmail: 'SELECT * FROM users WHERE email=?',
    getUserById: 'SELECT id, name, email FROM users WHERE id=?',
    deleteUser: 'DELETE FROM users WHERE id=?',

    // Projects (Projet: id, creator_id, name, description)
    initProjectsSqlite: 'CREATE TABLE IF NOT EXISTS projects (id varchar(36) PRIMARY KEY, creator_id varchar(36) NOT NULL, name varchar(255) NOT NULL, description text, FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE)',
    initProjectsMysql: 'CREATE TABLE IF NOT EXISTS projects (id varchar(36) PRIMARY KEY, creator_id varchar(36) NOT NULL, name varchar(255) NOT NULL, description text, FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE) DEFAULT CHARSET utf8mb4',
    createProject: 'INSERT INTO projects (id, creator_id, name, description) VALUES (?, ?, ?, ?)',
    getProjectsByCreator: 'SELECT DISTINCT p.* FROM projects p LEFT JOIN project_users pu ON p.id = pu.project_id WHERE p.creator_id=? OR pu.user_id=?',
    getAllProjects: 'SELECT * FROM projects',
    getProjectById: 'SELECT * FROM projects WHERE id=?',
    updateProject: 'UPDATE projects SET name=?, description=? WHERE id=?',
    deleteProject: 'DELETE FROM projects WHERE id=?',

    // Columns (Colonnes: id, project_id, name, description)
    initColumnsSqlite: 'CREATE TABLE IF NOT EXISTS columns (id varchar(36) PRIMARY KEY, project_id varchar(36) NOT NULL, name varchar(255) NOT NULL, description text, FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE)',
    initColumnsMysql: 'CREATE TABLE IF NOT EXISTS columns (id varchar(36) PRIMARY KEY, project_id varchar(36) NOT NULL, name varchar(255) NOT NULL, description text, FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE) DEFAULT CHARSET utf8mb4',
    createColumn: 'INSERT INTO columns (id, project_id, name, description) VALUES (?, ?, ?, ?)',
    getColumnsByProject: 'SELECT * FROM columns WHERE project_id=?',
    getColumnById: 'SELECT * FROM columns WHERE id=?',
    updateColumn: 'UPDATE columns SET name=?, description=? WHERE id=?',
    deleteColumn: 'DELETE FROM columns WHERE id=?',

    // Tasks (Taches: id, project_id, column_id, creator_id, name, description, completed, deadline, priority)
    initTasksSqlite: 'CREATE TABLE IF NOT EXISTS tasks (id varchar(36) PRIMARY KEY, project_id varchar(36), column_id varchar(36), creator_id varchar(36), name varchar(255) NOT NULL, description text, completed boolean DEFAULT 0, deadline text, priority varchar(50), FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE, FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE, FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE)',
    initTasksMysql: 'CREATE TABLE IF NOT EXISTS tasks (id varchar(36) PRIMARY KEY, project_id varchar(36), column_id varchar(36), creator_id varchar(36), name varchar(255) NOT NULL, description text, completed boolean DEFAULT 0, deadline date, priority varchar(50), FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE, FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE, FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE) DEFAULT CHARSET utf8mb4',
    alterTasksAddDeadlineSqlite: 'ALTER TABLE tasks ADD COLUMN deadline text',
    alterTasksAddPrioritySqlite: 'ALTER TABLE tasks ADD COLUMN priority varchar(50)',
    alterTasksAddDeadlineMysql: 'ALTER TABLE tasks ADD COLUMN deadline date',
    alterTasksAddPriorityMysql: 'ALTER TABLE tasks ADD COLUMN priority varchar(50)',
    createTask: 'INSERT INTO tasks (id, project_id, column_id, creator_id, name, description, completed, deadline, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    getTasksByProject: 'SELECT * FROM tasks WHERE project_id=?',
    getTasksByColumn: 'SELECT * FROM tasks WHERE column_id=?',
    getAllTasks: 'SELECT * FROM tasks',
    getTaskById: 'SELECT * FROM tasks WHERE id=?',
    updateTask: 'UPDATE tasks SET name=?, description=?, completed=?, column_id=?, deadline=?, priority=? WHERE id=?',
    deleteTask: 'DELETE FROM tasks WHERE id=?',

    // Task Users
    initTaskUsersSqlite: 'CREATE TABLE IF NOT EXISTS task_users (task_id varchar(36), user_id varchar(36), PRIMARY KEY (task_id, user_id), FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)',
    initTaskUsersMysql: 'CREATE TABLE IF NOT EXISTS task_users (task_id varchar(36), user_id varchar(36), PRIMARY KEY (task_id, user_id), FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) DEFAULT CHARSET utf8mb4',
    assignUserToTaskSqlite: 'INSERT OR IGNORE INTO task_users (task_id, user_id) VALUES (?, ?)',
    assignUserToTaskMysql: 'INSERT IGNORE INTO task_users (task_id, user_id) VALUES (?, ?)',
    getTaskUsers: 'SELECT u.id, u.name, u.email FROM users u JOIN task_users tu ON u.id = tu.user_id WHERE tu.task_id = ?',
    removeUserFromTask: 'DELETE FROM task_users WHERE task_id = ? AND user_id = ?',

    // Project Users
    initProjectUsersSqlite: 'CREATE TABLE IF NOT EXISTS project_users (project_id varchar(36), user_id varchar(36), PRIMARY KEY (project_id, user_id), FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)',
    initProjectUsersMysql: 'CREATE TABLE IF NOT EXISTS project_users (project_id varchar(36), user_id varchar(36), PRIMARY KEY (project_id, user_id), FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) DEFAULT CHARSET utf8mb4',
    assignUserToProjectSqlite: 'INSERT OR IGNORE INTO project_users (project_id, user_id) VALUES (?, ?)',
    assignUserToProjectMysql: 'INSERT IGNORE INTO project_users (project_id, user_id) VALUES (?, ?)',
    getProjectUsers: 'SELECT u.id, u.name, u.email FROM users u JOIN project_users pu ON u.id = pu.user_id WHERE pu.project_id = ?',
    removeUserFromProject: 'DELETE FROM project_users WHERE project_id = ? AND user_id = ?',
};
