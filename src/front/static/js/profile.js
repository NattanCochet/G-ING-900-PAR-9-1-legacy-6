document.addEventListener('DOMContentLoaded', () => {

    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
        window.location.href = '/login';
        return;
    }

    let user;
    try {
        user = JSON.parse(userStr);
    } catch (e) {
        window.location.href = '/login';
        return;
    }

    const themeBtn = document.getElementById('themeBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const profileForm = document.getElementById('profileForm');
    const cancelProfileBtn = document.getElementById('cancelProfileBtn');
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');

    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profileOldPassword = document.getElementById('profileOldPassword');
    const profileNewPassword = document.getElementById('profileNewPassword');
    const profileConfirmPassword = document.getElementById('profileConfirmPassword');
    const passwordErrorMsg = document.getElementById('passwordErrorMsg');

    const deleteModalOverlay = document.getElementById('deleteModalOverlay');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const toasterContainer = document.getElementById('toasterContainer');

    profileName.value = user.name || '';
    const greeting = document.getElementById('greeting');
    if (greeting) greeting.textContent = 'Hello, ' + user.name;
    profileEmail.value = user.email || '';

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark-theme');
        document.documentElement.classList.remove('light-theme');
    } else {
        document.documentElement.classList.add('light-theme');
        document.documentElement.classList.remove('dark-theme');
    }

    themeBtn.addEventListener('click', () => {
        if (document.documentElement.classList.contains('dark-theme')) {
            document.documentElement.classList.remove('dark-theme');
            document.documentElement.classList.add('light-theme');
            localStorage.setItem('theme', 'light');
        } else {
            document.documentElement.classList.remove('light-theme');
            document.documentElement.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    });

    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = 'toast ' + type;
        toast.textContent = message;
        toasterContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }, 4000);
    }

    function validatePasswords() {
        const newPass = profileNewPassword.value;
        const confirmPass = profileConfirmPassword.value;

        if (newPass || confirmPass) {
            if (newPass !== confirmPass) {
                passwordErrorMsg.hidden = false;
                return false;
            }
        }
        passwordErrorMsg.hidden = true;
        return true;
    }

    profileNewPassword.addEventListener('input', validatePasswords);
    profileConfirmPassword.addEventListener('input', validatePasswords);

    cancelProfileBtn.addEventListener('click', () => {

        profileName.value = user.name || '';
    const greeting = document.getElementById('greeting');
    if (greeting) greeting.textContent = 'Hello, ' + user.name;
        profileEmail.value = user.email || '';
        profileOldPassword.value = '';
        profileNewPassword.value = '';
        profileConfirmPassword.value = '';
        passwordErrorMsg.hidden = true;
    });

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!validatePasswords()) {
            return;
        }

        const name = profileName.value.trim();
        const email = profileEmail.value.trim();
        const oldPassword = profileOldPassword.value;
        const newPassword = profileNewPassword.value;

        if (!name || !email) {
            showToast('Name and Email are required.', 'error');
            return;
        }

        if (newPassword && !oldPassword) {
            showToast('Current Password is required to set a new password.', 'error');
            return;
        }

        const payload = { name, email };
        if (newPassword) {
            payload.oldPassword = oldPassword;
            payload.newPassword = newPassword;
        }

        saveProfileBtn.disabled = true;
        saveProfileBtn.textContent = 'Saving...';

        try {


            const response = await fetch('/users/' + user.id, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();

                user = { ...user, name: data.user?.name || name, email: data.user?.email || email };
                localStorage.setItem('user', JSON.stringify(user));
                
                profileOldPassword.value = '';
                profileNewPassword.value = '';
                profileConfirmPassword.value = '';
                
                showToast('Profile updated successfully!', 'success');
            } else {
                const errData = await response.json().catch(() => ({}));
                showToast(errData.error || 'Failed to update profile.', 'error');
            }
        } catch (error) {
            showToast('An error occurred while saving.', 'error');
        } finally {
            saveProfileBtn.disabled = false;
            saveProfileBtn.textContent = 'Save Changes';
        }
    });

    deleteAccountBtn.addEventListener('click', () => {
        deleteModalOverlay.hidden = false;
    });

    cancelDeleteBtn.addEventListener('click', () => {
        deleteModalOverlay.hidden = true;
    });

    confirmDeleteBtn.addEventListener('click', async () => {
        confirmDeleteBtn.disabled = true;
        confirmDeleteBtn.textContent = 'Deleting...';

        try {
            const response = await fetch('/users/' + user.id, {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });

            if (response.ok) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            } else {
                const errData = await response.json().catch(() => ({}));
                showToast(errData.error || 'Failed to delete account.', 'error');
                confirmDeleteBtn.disabled = false;
                confirmDeleteBtn.textContent = 'Yes, Delete My Account';
                deleteModalOverlay.hidden = true;
            }
        } catch (error) {
            showToast('An error occurred while deleting account.', 'error');
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.textContent = 'Yes, Delete My Account';
            deleteModalOverlay.hidden = true;
        }
    });
});



