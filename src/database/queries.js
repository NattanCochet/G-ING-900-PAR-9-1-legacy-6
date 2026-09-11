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
    getProjectsByCreator: 'SELECT * FROM projects WHERE creator_id=?',
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

    // Tasks (Taches: id, project_id, column_id, creator_id, name, description, completed)
    initTasksSqlite: 'CREATE TABLE IF NOT EXISTS tasks (id varchar(36) PRIMARY KEY, project_id varchar(36), column_id varchar(36), creator_id varchar(36), name varchar(255) NOT NULL, description text, completed boolean DEFAULT 0, FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE, FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE, FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE)',
    initTasksMysql: 'CREATE TABLE IF NOT EXISTS tasks (id varchar(36) PRIMARY KEY, project_id varchar(36), column_id varchar(36), creator_id varchar(36), name varchar(255) NOT NULL, description text, completed boolean DEFAULT 0, FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE, FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE, FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE) DEFAULT CHARSET utf8mb4',
    createTask: 'INSERT INTO tasks (id, project_id, column_id, creator_id, name, description, completed) VALUES (?, ?, ?, ?, ?, ?, ?)',
    getTasksByProject: 'SELECT * FROM tasks WHERE project_id=?',
    getTasksByColumn: 'SELECT * FROM tasks WHERE column_id=?',
    getAllTasks: 'SELECT * FROM tasks',
    getTaskById: 'SELECT * FROM tasks WHERE id=?',
    updateTask: 'UPDATE tasks SET name=?, description=?, completed=?, column_id=? WHERE id=?',
    deleteTask: 'DELETE FROM tasks WHERE id=?',
};
