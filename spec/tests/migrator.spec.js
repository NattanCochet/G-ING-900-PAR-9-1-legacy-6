const migrator = require('../../src/database/migrator');

describe('Database Migrator', () => {
    test('it reads and sets last active driver', () => {
        migrator.setLastActiveDriver('test_driver');
        expect(migrator.getLastActiveDriver()).toBe('test_driver');
    });

    test('it skips sync in test environment by default', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'test';
        delete process.env.ENABLE_TEST_MIGRATION;

        migrator.setLastActiveDriver('sqlite');
        await migrator.syncOnStartup('mysql');

        // Driver was not modified because sync skipped
        expect(migrator.getLastActiveDriver()).toBe('sqlite');
        process.env.NODE_ENV = originalEnv;
    });

    test('it updates active driver when ENABLE_TEST_MIGRATION is set', async () => {
        process.env.ENABLE_TEST_MIGRATION = 'true';

        migrator.setLastActiveDriver('sqlite');
        await migrator.syncOnStartup('mysql');
        expect(migrator.getLastActiveDriver()).toBe('mysql');

        await migrator.syncOnStartup('sqlite');
        expect(migrator.getLastActiveDriver()).toBe('sqlite');

        delete process.env.ENABLE_TEST_MIGRATION;
    });
});
