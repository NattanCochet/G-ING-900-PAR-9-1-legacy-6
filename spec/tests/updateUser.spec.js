const db = require('../../src/database');
const { updateUser } = require('../../src/routes/auth');
const bcrypt = require('bcryptjs');
const { eventBus } = require('../../src/events');

jest.mock('../../src/database', () => ({
    updateUser: jest.fn(),
    getUserById: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
    hash: jest.fn().mockResolvedValue('new_hashed_password'),
    compare: jest.fn(),
}));

jest.mock('../../src/events', () => ({
    eventBus: { emit: jest.fn() },
    eventTypes: { USER_UPDATED: 'user.updated' },
}));

const USER = { id: '39239e74-7e5c-42b7-a1f7-cf5c2f150296', name: 'Old Name', email: 'old@example.com', password: 'old_hashed_password' };

beforeEach(() => {
    jest.clearAllMocks();
});

test('it updates user name and email correctly', async () => {
    db.getUserById.mockResolvedValue(USER);
    
    const req = { 
        params: { id: USER.id },
        user: { id: USER.id },
        body: { name: 'New Name', email: 'new@example.com' }
    };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

    await updateUser(req, res);

    expect(db.updateUser.mock.calls.length).toBe(1);
    expect(db.updateUser.mock.calls[0][0]).toBe(USER.id);
    expect(db.updateUser.mock.calls[0][1]).toEqual({ name: 'New Name', email: 'new@example.com', password: 'old_hashed_password' });
    
    expect(res.status.mock.calls[0][0]).toBe(200);
    expect(res.send.mock.calls[0][0]).toEqual({ id: USER.id, name: 'New Name', email: 'new@example.com' });
    
    expect(eventBus.emit).toHaveBeenCalledWith('user.updated', { id: USER.id, name: 'New Name', email: 'new@example.com' });
});

test('it prevents updating another user', async () => {
    const req = { 
        params: { id: 'other-id' },
        user: { id: USER.id },
        body: { name: 'Hacker' }
    };
    const res = { sendStatus: jest.fn() };

    await updateUser(req, res);

    expect(res.sendStatus.mock.calls[0][0]).toBe(403);
    expect(db.updateUser.mock.calls.length).toBe(0);
});

test('it hashes new password if old password is verified', async () => {
    db.getUserById.mockResolvedValue(USER);
    bcrypt.compare.mockResolvedValue(true);

    const req = {
        params: { id: USER.id },
        user: { id: USER.id },
        body: { oldPassword: 'old_plain_password', newPassword: 'new_plain_password' }
    };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

    await updateUser(req, res);

    expect(bcrypt.compare).toHaveBeenCalledWith('old_plain_password', 'old_hashed_password');
    expect(bcrypt.hash).toHaveBeenCalledWith('new_plain_password', 10);
    expect(db.updateUser.mock.calls[0][1]).toEqual({ name: USER.name, email: USER.email, password: 'new_hashed_password' });
});

test('it rejects password change without current password', async () => {
    db.getUserById.mockResolvedValue(USER);

    const req = {
        params: { id: USER.id },
        user: { id: USER.id },
        body: { newPassword: 'new_plain_password' }
    };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

    await updateUser(req, res);

    expect(res.status.mock.calls[0][0]).toBe(400);
    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(db.updateUser.mock.calls.length).toBe(0);
});

test('it rejects password change when current password is incorrect', async () => {
    db.getUserById.mockResolvedValue(USER);
    bcrypt.compare.mockResolvedValue(false);

    const req = {
        params: { id: USER.id },
        user: { id: USER.id },
        body: { oldPassword: 'wrong_password', newPassword: 'new_plain_password' }
    };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

    await updateUser(req, res);

    expect(res.status.mock.calls[0][0]).toBe(401);
    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(db.updateUser.mock.calls.length).toBe(0);
});
