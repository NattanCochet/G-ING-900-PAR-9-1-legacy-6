if (!process.env.DB_TYPE && !process.env.MYSQL_HOST && !process.env.MYSQLHOST) {
    require('dotenv').config();
}
const migrator = require('./migrator');

const dbDriver = (process.env.DB_TYPE || process.env.DATABASE_TYPE || process.env.DB_DRIVER || '').toLowerCase();
const activeDriver = dbDriver === 'mysql' || (!dbDriver && (process.env.MYSQL_HOST || process.env.MYSQLHOST)) ? 'mysql' : 'sqlite';
const db = require(`./${activeDriver}`);

const originalInit = db.init.bind(db);
db.init = async function () {
    const res = await originalInit();
    await migrator.syncOnStartup(activeDriver);
    return res;
};

module.exports = db;
