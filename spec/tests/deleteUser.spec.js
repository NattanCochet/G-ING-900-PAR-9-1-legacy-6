const db = require('../../src/database');
const deleteUser = require('../../src/routes/deleteUser');
const USER = { id: '39239e74-7e5c-42b7-a1f7-cf5c2f150296' };

jest.mock('../../src/database', () => ({
    deleteUser: jest.fn(),
    getUserById: jest.fn(),
}));

test('it removes user correctly', async () => {
    const req = { 
        params: { id: USER.id },
        user: { id: USER.id },
    };
    const res = { sendStatus: jest.fn() };

    await deleteUser(req, res);

    expect(db.deleteUser.mock.calls.length).toBe(1);
    expect(db.deleteUser.mock.calls[0][0]).toBe(req.params.id);
    expect(res.sendStatus.mock.calls[0].length).toBe(1);
    expect(res.sendStatus.mock.calls[0][0]).toBe(200);
});