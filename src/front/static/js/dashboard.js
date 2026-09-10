(() => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    const fetchWithAuth = async (url, options = {}) => {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                Authorization: `Bearer ${token}`,
            },
        });
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
            throw new Error('Unauthorized');
        }
        return response;
    };

    const escapeHtml = (str) =>
        String(str ?? '').replace(/[&<>"']/g, (c) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
        }[c]));

    const projectsView = document.getElementById('projectsView');
    const boardView = document.getElementById('boardView');
    const projectsGrid = document.getElementById('projectsGrid');
    const projectsEmpty = document.getElementById('projectsEmpty');
    const boardEl = document.getElementById('board');
    const boardTitle = document.getElementById('boardTitle');
    const boardSubtitle = document.getElementById('boardSubtitle');
    const greeting = document.getElementById('greeting');

    let currentProject = null;
    let columns = [];
    let tasks = [];

    const initGreeting = () => {
        try {
            const user = JSON.parse(localStorage.getItem('user') || 'null');
            greeting.textContent = user && user.name ? `Hi, ${user.name}` : '';
        } catch {
            greeting.textContent = '';
        }
    };

    const showProjectsView = () => {
        currentProject = null;
        boardView.hidden = true;
        projectsView.hidden = false;
    };

    const showBoardView = () => {
        projectsView.hidden = true;
        boardView.hidden = false;
    };

    // --- Projects ---

    const loadProjects = async () => {
        const res = await fetchWithAuth('/projects');
        const projects = await res.json();
        renderProjects(projects);
    };

    const renderProjects = (projects) => {
        projectsGrid.innerHTML = '';
        projectsEmpty.hidden = projects.length > 0;

        projects.forEach((project) => {
            const card = document.createElement('div');
            card.className = 'project-card';
            card.tabIndex = 0;
            card.setAttribute('role', 'button');
            card.innerHTML = `
                <div class="card-actions">
                    <button type="button" class="card-icon-btn edit-project" title="Edit project" aria-label="Edit project">&#9998;</button>
                    <button type="button" class="card-icon-btn delete-project" title="Delete project" aria-label="Delete project">&times;</button>
                </div>
                <h3 class="project-name">${escapeHtml(project.name)}</h3>
                <p class="project-description">${escapeHtml(project.description || 'No description')}</p>
            `;
            card.addEventListener('click', () => openProject(project));
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openProject(project);
                }
            });
            card.querySelector('.edit-project').addEventListener('click', (e) => {
                e.stopPropagation();
                openProjectModal(project);
            });
            card.querySelector('.delete-project').addEventListener('click', (e) => {
                e.stopPropagation();
                removeProject(project);
            });
            projectsGrid.appendChild(card);
        });
    };

    const removeProject = async (project) => {
        if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
        await fetchWithAuth(`/projects/${project.id}`, { method: 'DELETE' });
        if (currentProject && currentProject.id === project.id) {
            showProjectsView();
        }
        await loadProjects();
    };

    const openProject = async (project) => {
        currentProject = project;
        boardTitle.textContent = project.name;
        boardSubtitle.textContent = project.description || '';
        showBoardView();
        await loadBoard();
    };

    // --- Board (columns + tasks) ---

    const loadBoard = async () => {
        const [columnsRes, tasksRes] = await Promise.all([
            fetchWithAuth(`/projects/${currentProject.id}/columns`),
            fetchWithAuth(`/projects/${currentProject.id}/tasks`),
        ]);
        columns = await columnsRes.json();
        tasks = await tasksRes.json();
        renderBoard();
    };

    const renderBoard = () => {
        boardEl.innerHTML = '';

        if (columns.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'board-empty';
            empty.textContent = 'No columns yet — add one to start organizing tasks.';
            boardEl.appendChild(empty);
        }

        columns.forEach((column) => {
            boardEl.appendChild(renderColumn(column));
        });

        boardEl.appendChild(renderAddColumn());
    };

    const renderColumn = (column) => {
        const columnTasks = tasks.filter((t) => t.column_id === column.id);

        const el = document.createElement('div');
        el.className = 'column';
        el.innerHTML = `
            <div class="column-header">
                <span class="column-name">${escapeHtml(column.name)}</span>
                <div class="column-actions">
                    <button class="column-icon-btn column-edit" title="Rename column" aria-label="Rename column">&#9998;</button>
                    <button class="column-icon-btn column-remove" title="Delete column" aria-label="Delete column">&times;</button>
                </div>
            </div>
            <div class="task-list"></div>
            <button class="add-task-btn">+ Add task</button>
        `;

        el.querySelector('.column-edit').addEventListener('click', () => startColumnRename(el, column));
        el.querySelector('.column-remove').addEventListener('click', () => deleteColumn(column));

        const taskList = el.querySelector('.task-list');
        columnTasks.forEach((task) => taskList.appendChild(renderTask(task)));

        const addTaskBtn = el.querySelector('.add-task-btn');
        addTaskBtn.addEventListener('click', () => {
            const form = document.createElement('form');
            form.className = 'add-task-form';
            form.innerHTML = `<input type="text" placeholder="Task name" autocomplete="off" />`;
            addTaskBtn.replaceWith(form);
            const input = form.querySelector('input');
            input.focus();

            const cancel = () => {
                form.replaceWith(addTaskBtn);
            };

            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = input.value.trim();
                if (!name) return cancel();
                await createTask(column, name);
            });

            input.addEventListener('blur', () => {
                setTimeout(cancel, 100);
            });
        });

        return el;
    };

    const renderTask = (task) => {
        const el = document.createElement('div');
        el.className = `task-card${task.completed ? ' completed' : ''}`;
        el.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} aria-label="Toggle task completion" />
            <div class="task-body">
                <span class="task-name">${escapeHtml(task.name)}</span>
                ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}
            </div>
            <div class="task-actions">
                <button class="task-icon-btn task-edit" title="Edit task" aria-label="Edit task">&#9998;</button>
                <button class="task-icon-btn task-remove" title="Delete task" aria-label="Delete task">&times;</button>
            </div>
        `;
        el.querySelector('.task-checkbox').addEventListener('change', () => toggleTask(task));
        el.querySelector('.task-edit').addEventListener('click', () => openTaskModal(task));
        el.querySelector('.task-remove').addEventListener('click', () => deleteTask(task));
        return el;
    };

    // --- Inline rename ---

    const startColumnRename = (columnEl, column) => {
        const header = columnEl.querySelector('.column-header');
        const nameSpan = header.querySelector('.column-name');

        const form = document.createElement('form');
        form.className = 'rename-form';
        form.innerHTML = `<input type="text" class="inline-edit-input" value="${escapeHtml(column.name)}" autocomplete="off" />`;
        header.replaceChild(form, nameSpan);

        const input = form.querySelector('input');
        input.focus();
        input.select();

        const cancel = () => {
            if (form.isConnected) form.replaceWith(nameSpan);
        };

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = input.value.trim();
            if (!name || name === column.name) return cancel();
            await renameColumn(column, name);
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') cancel();
        });
        input.addEventListener('blur', () => setTimeout(cancel, 100));
    };

    const renderAddColumn = () => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'add-column';
        btn.textContent = '+ Add column';

        btn.addEventListener('click', () => {
            const form = document.createElement('form');
            form.className = 'add-column-form';
            form.innerHTML = `<input type="text" placeholder="Column name" autocomplete="off" />`;
            btn.replaceWith(form);
            const input = form.querySelector('input');
            input.focus();

            const cancel = () => {
                form.replaceWith(btn);
            };

            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = input.value.trim();
                if (!name) return cancel();
                await createColumn(name);
            });

            input.addEventListener('blur', () => setTimeout(cancel, 100));
        });

        return btn;
    };

    // --- Mutations ---

    const createColumn = async (name) => {
        await fetchWithAuth('/columns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, project_id: currentProject.id }),
        });
        await loadBoard();
    };

    const renameColumn = async (column, name) => {
        await fetchWithAuth(`/columns/${column.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        });
        await loadBoard();
    };

    const deleteColumn = async (column) => {
        await fetchWithAuth(`/columns/${column.id}`, { method: 'DELETE' });
        await loadBoard();
    };

    const createTask = async (column, name) => {
        await fetchWithAuth('/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, project_id: currentProject.id, column_id: column.id }),
        });
        await loadBoard();
    };

    const toggleTask = async (task) => {
        await fetchWithAuth(`/tasks/${task.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed: !task.completed }),
        });
        await loadBoard();
    };

    const updateTask = async (task, { name, description }) => {
        await fetchWithAuth(`/tasks/${task.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description }),
        });
        await loadBoard();
    };

    const deleteTask = async (task) => {
        await fetchWithAuth(`/tasks/${task.id}`, { method: 'DELETE' });
        await loadBoard();
    };

    // --- Project modal ---

    const projectModalOverlay = document.getElementById('projectModalOverlay');
    const projectModalTitle = document.getElementById('projectModalTitle');
    const projectForm = document.getElementById('projectForm');
    const projectSubmitBtn = document.getElementById('projectSubmitBtn');
    const projectNameInput = document.getElementById('projectName');
    const projectDescriptionInput = document.getElementById('projectDescription');

    let editingProject = null;

    const openProjectModal = (project = null) => {
        editingProject = project;
        projectForm.reset();

        if (project) {
            projectModalTitle.textContent = 'Edit Project';
            projectSubmitBtn.textContent = 'Save';
            projectNameInput.value = project.name;
            projectDescriptionInput.value = project.description || '';
        } else {
            projectModalTitle.textContent = 'New Project';
            projectSubmitBtn.textContent = 'Create';
        }

        projectModalOverlay.hidden = false;
        projectNameInput.focus();
    };

    const closeProjectModal = () => {
        projectModalOverlay.hidden = true;
        editingProject = null;
    };

    document.getElementById('newProjectBtn').addEventListener('click', () => openProjectModal());
    document.getElementById('cancelProjectBtn').addEventListener('click', closeProjectModal);
    projectModalOverlay.addEventListener('click', (e) => {
        if (e.target === projectModalOverlay) closeProjectModal();
    });

    projectForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = projectNameInput.value.trim();
        const description = projectDescriptionInput.value.trim();
        if (!name) return;

        if (editingProject) {
            await fetchWithAuth(`/projects/${editingProject.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description: description || null }),
            });
            if (currentProject && currentProject.id === editingProject.id) {
                currentProject = { ...currentProject, name, description };
                boardTitle.textContent = name;
                boardSubtitle.textContent = description || '';
            }
        } else {
            await fetchWithAuth('/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description: description || null }),
            });
        }

        closeProjectModal();
        await loadProjects();
    });

    // --- Task modal ---

    const taskModalOverlay = document.getElementById('taskModalOverlay');
    const taskForm = document.getElementById('taskForm');
    const taskModalNameInput = document.getElementById('taskModalName');
    const taskModalDescriptionInput = document.getElementById('taskModalDescription');

    let editingTask = null;

    const openTaskModal = (task) => {
        editingTask = task;
        taskForm.reset();
        taskModalNameInput.value = task.name;
        taskModalDescriptionInput.value = task.description || '';
        taskModalOverlay.hidden = false;
        taskModalNameInput.focus();
    };

    const closeTaskModal = () => {
        taskModalOverlay.hidden = true;
        editingTask = null;
    };

    document.getElementById('cancelTaskBtn').addEventListener('click', closeTaskModal);
    taskModalOverlay.addEventListener('click', (e) => {
        if (e.target === taskModalOverlay) closeTaskModal();
    });

    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = taskModalNameInput.value.trim();
        const description = taskModalDescriptionInput.value.trim();
        if (!name || !editingTask) return;

        await updateTask(editingTask, { name, description: description || null });
        closeTaskModal();
    });

    // --- Board view controls ---

    document.getElementById('backBtn').addEventListener('click', () => {
        showProjectsView();
        loadProjects();
    });

    document.getElementById('editProjectBtn').addEventListener('click', () => {
        if (currentProject) openProjectModal(currentProject);
    });

    document.getElementById('deleteProjectBtn').addEventListener('click', () => {
        if (currentProject) removeProject(currentProject);
    });

    // --- Logout ---

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    });

    // --- Init ---

    initGreeting();
    loadProjects();
})();
