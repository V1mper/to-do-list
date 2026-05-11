// Конфигурация
const API_URL = 'http://localhost:8000/api/v1';
let currentToken = localStorage.getItem('token');
let currentFilter = 'all';
let currentSearch = '';

// Проверка авторизации
if (!currentToken && !window.location.pathname.includes('login') && !window.location.pathname.includes('register')) {
    window.location.href = '/login.html';
}

// Вспомогательные функции
function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
    };
}

async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: { ...getHeaders(), ...options.headers }
    });

    if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login.html';
        return null;
    }

    return response;
}

// ========== СТРАНИЦА ЛОГИНА ==========
if (window.location.pathname.includes('login.html') || window.location.pathname === '/login.html') {
    const form = document.getElementById('loginForm');
    const errorDiv = document.getElementById('error');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('token', data.access_token);
                window.location.href = '/index.html';
            } else {
                const error = await response.json();
                errorDiv.textContent = error.detail || 'Ошибка входа';
                errorDiv.classList.remove('hidden');
            }
        } catch (err) {
            errorDiv.textContent = 'Ошибка соединения с сервером';
            errorDiv.classList.remove('hidden');
        }
    });
}

// ========== СТРАНИЦА РЕГИСТРАЦИИ ==========
if (window.location.pathname.includes('register.html') || window.location.pathname === '/register.html') {
    const form = document.getElementById('registerForm');
    const errorDiv = document.getElementById('error');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirm = document.getElementById('confirm').value;

        if (password !== confirm) {
            errorDiv.textContent = 'Пароли не совпадают';
            errorDiv.classList.remove('hidden');
            return;
        }

        if (password.length < 6) {
            errorDiv.textContent = 'Пароль должен быть не менее 6 символов';
            errorDiv.classList.remove('hidden');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                window.location.href = '/login.html';
            } else {
                const error = await response.json();
                errorDiv.textContent = error.detail || 'Ошибка регистрации';
                errorDiv.classList.remove('hidden');
            }
        } catch (err) {
            errorDiv.textContent = 'Ошибка соединения с сервером';
            errorDiv.classList.remove('hidden');
        }
    });
}

// ========== ГЛАВНАЯ СТРАНИЦА ==========
if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname === '/index.html') {
    currentToken = localStorage.getItem('token');
    if (!currentToken) {
        window.location.href = '/login.html';
    }

    let currentEditTaskId = null;

    // DOM элементы
    const taskList = document.getElementById('taskList');
    const addBtn = document.getElementById('addTaskBtn');
    const modal = document.getElementById('taskModal');
    const taskForm = document.getElementById('taskForm');
    const modalTitle = document.getElementById('modalTitle');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');
    const totalCountSpan = document.getElementById('totalCount');
    const doneCountSpan = document.getElementById('doneCount');
    const progressFill = document.getElementById('progressFill');

    // Функции
    async function loadTasks() {
        try {
            let url = `/tasks?filter=${currentFilter}`;
            if (currentSearch) {
                url += `&search=${encodeURIComponent(currentSearch)}`;
            }

            const response = await apiRequest(url);
            if (response && response.ok) {
                const tasks = await response.json();
                renderTasks(tasks);
                loadStats();
            }
        } catch (err) {
            taskList.innerHTML = '<div class="empty-state">Ошибка загрузки задач</div>';
        }
    }

    async function loadStats() {
        try {
            const response = await apiRequest('/tasks/stats');
            if (response && response.ok) {
                const stats = await response.json();
                totalCountSpan.textContent = stats.total;
                doneCountSpan.textContent = stats.done;
                progressFill.style.width = `${stats.percent}%`;
            }
        } catch (err) {
            console.error('Stats error:', err);
        }
    }

    function renderTasks(tasks) {
        if (!tasks || tasks.length === 0) {
            taskList.innerHTML = '<div class="empty-state">📭 Нет задач. Создайте первую!</div>';
            return;
        }

        taskList.innerHTML = '';
        tasks.forEach(task => {
            const taskCard = document.createElement('div');
            taskCard.className = `task-card ${task.is_done ? 'done' : ''}`;
            taskCard.dataset.id = task.id;

            const checkbox = document.createElement('div');
            checkbox.className = `task-checkbox ${task.is_done ? 'checked' : ''}`;
            checkbox.addEventListener('click', () => toggleTask(task.id, !task.is_done));

            const content = document.createElement('div');
            content.className = 'task-content';
            content.innerHTML = `
                <div class="task-title">${escapeHtml(task.title)}</div>
                <div class="task-meta">
                    ${task.description ? `<span>📄 ${escapeHtml(task.description)}</span>` : ''}
                    ${task.due_date ? `<span class="${task.is_overdue ? 'overdue' : ''}">📅 ${task.due_date} ${task.is_overdue ? '⚠️ Просрочено' : ''}</span>` : ''}
                </div>
            `;

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'task-delete';
            deleteBtn.innerHTML = '🗑️';
            deleteBtn.addEventListener('click', () => deleteTask(task.id));

            taskCard.appendChild(checkbox);
            taskCard.appendChild(content);
            taskCard.appendChild(deleteBtn);

            // Редактирование по клику на карточку (кроме кнопок)
            taskCard.addEventListener('click', (e) => {
                if (e.target === checkbox || e.target === deleteBtn || e.target === deleteBtn.firstChild) return;
                openEditModal(task);
            });

            taskList.appendChild(taskCard);
        });
    }

    async function toggleTask(id, isDone) {
        try {
            const response = await apiRequest(`/tasks/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_done: isDone })
            });
            if (response && response.ok) {
                loadTasks();
            }
        } catch (err) {
            console.error('Toggle error:', err);
        }
    }

    async function deleteTask(id) {
        if (!confirm('Удалить задачу?')) return;
        try {
            const response = await apiRequest(`/tasks/${id}`, { method: 'DELETE' });
            if (response && response.ok) {
                loadTasks();
            }
        } catch (err) {
            console.error('Delete error:', err);
        }
    }

    function openEditModal(task = null) {
    if (task) {
        currentEditTaskId = task.id;
        modalTitle.textContent = 'Редактировать задачу';
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskDesc').value = task.description || '';
        document.getElementById('taskDueDate').value = task.due_date || '';
    } else {
        currentEditTaskId = null;
        modalTitle.textContent = 'Новая задача';
        taskForm.reset();
    }
    modal.classList.remove('hidden');  // Убираем hidden — показываем
}

async function saveTask(event) {
    event.preventDefault();
    const title = document.getElementById('taskTitle').value.trim();
    if (!title) {
        alert('Заголовок обязателен');
        return;
    }

    const taskData = {
        title: title,
        description: document.getElementById('taskDesc').value || null,
        due_date: document.getElementById('taskDueDate').value || null
    };

    try {
        let response;
        if (currentEditTaskId) {
            response = await apiRequest(`/tasks/${currentEditTaskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            });
        } else {
            response = await apiRequest('/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            });
        }

        if (response && response.ok) {
            modal.classList.add('hidden');       // Скрываем модалку
            taskForm.reset();                    // Очищаем форму
            currentEditTaskId = null;            // Сбрасываем ID редактирования
            loadTasks();                         // Обновляем список задач
        } else if (response) {
            const err = await response.json();
            alert(err.detail || 'Ошибка сохранения');
        }
    } catch (err) {
        alert('Ошибка соединения');
    }
}

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    // Фильтры
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            loadTasks();
        });
    });

    // Поиск с debounce
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const value = e.target.value;
        if (value.length >= 2 || value.length === 0) {
            searchTimeout = setTimeout(() => {
                currentSearch = value;
                if (currentSearch) {
                    clearSearch.classList.remove('hidden');
                } else {
                    clearSearch.classList.add('hidden');
                }
                loadTasks();
            }, 300);
        }
    });

    clearSearch.addEventListener('click', () => {
        searchInput.value = '';
        currentSearch = '';
        clearSearch.classList.add('hidden');
        loadTasks();
    });

// Закрытие по кнопке "Отмена"
cancelModalBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    taskForm.reset();
    currentEditTaskId = null;
});

// Закрытие при клике на фон
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.add('hidden');
        taskForm.reset();
        currentEditTaskId = null;
    }
});

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = '/login.html';
    });

    // WebSocket (опционально)
    function connectWebSocket() {
        const ws = new WebSocket(`ws://localhost:8000/ws/0`);
        ws.onmessage = (event) => {
            console.log('Уведомление:', event.data);
            loadTasks(); // обновить при получении уведомления
        };
        ws.onerror = (err) => console.error('WebSocket error:', err);
    }
    // connectWebSocket(); // раскомментировать при необходимости

    // Загрузка при старте
    loadTasks();
}
