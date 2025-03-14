// Estructura de datos para almacenar tareas por día y por grupo
const todoData = {
    // Formato: 'YYYY-MM-DD': { grupos }
};

// Estado de la aplicación
let currentDate = new Date();
let currentDateString = formatDate(currentDate);
let expandedGroups = new Set();

// Elementos DOM
const groupsGrid = document.getElementById('groups-grid');
const newGroupInput = document.getElementById('new-group-input');
const addGroupBtn = document.getElementById('add-group-btn');
const currentDateEl = document.getElementById('current-date');
const prevDayBtn = document.getElementById('prev-day');
const nextDayBtn = document.getElementById('next-day');
const totalTasksEl = document.getElementById('total-tasks');
const completedTasksEl = document.getElementById('completed-tasks');
const completionRateEl = document.getElementById('completion-rate');

// Plantillas
const groupTemplate = document.getElementById('group-template');
const todoTemplate = document.getElementById('todo-template');

// Inicializar la aplicación
function init() {
    // Cargar datos guardados
    loadFromLocalStorage();
    
    // Actualizar fecha actual
    updateDateDisplay();
    
    // Renderizar grupos y tareas
    renderGroups();
    
    // Event listeners
    addGroupBtn.addEventListener('click', createNewGroup);
    prevDayBtn.addEventListener('click', () => navigateDay(-1));
    nextDayBtn.addEventListener('click', () => navigateDay(1));
    document.getElementById('copy-groups').addEventListener('click', copyGroupsFromPreviousDay);
    
    // Event listener para crear grupo con Enter
    newGroupInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createNewGroup();
    });
    
    // Actualizar estadísticas
    updateStats();
}

// Funciones de manipulación de datos
function createNewGroup() {
    const groupTitle = newGroupInput.value.trim();
    if (!groupTitle) return;
    
    // Inicializar el día actual si no existe
    if (!todoData[currentDateString]) {
        todoData[currentDateString] = {};
    }
    
    // Crear nuevo grupo
    const groupId = 'group_' + Date.now();
    todoData[currentDateString][groupId] = {
        title: groupTitle,
        todos: {}
    };
    
    // Añadir a expandidos por defecto
    expandedGroups.add(groupId);
    
    // Limpiar input
    newGroupInput.value = '';
    
    // Actualizar UI
    renderGroups();
    saveToLocalStorage();
}

function createNewTodo(groupId, todoText) {
    if (!todoText) return;
    
    const todoId = 'todo_' + Date.now();
    todoData[currentDateString][groupId].todos[todoId] = {
        text: todoText,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    // Actualizar UI
    renderTodos(groupId);
    updateStats();
    saveToLocalStorage();
}

function toggleTodoCompleted(groupId, todoId) {
    const todo = todoData[currentDateString][groupId].todos[todoId];
    todo.completed = !todo.completed;
    
    // Add or remove completion time
    if (todo.completed) {
        todo.completedAt = new Date().toISOString();
    } else {
        delete todo.completedAt;
    }
    
    // Actualizar UI
    updateStats();
    saveToLocalStorage();
}

function deleteTodo(groupId, todoId) {
    delete todoData[currentDateString][groupId].todos[todoId];
    
    // Actualizar UI
    renderTodos(groupId);
    updateStats();
    saveToLocalStorage();
}

function deleteGroup(groupId) {
    delete todoData[currentDateString][groupId];
    expandedGroups.delete(groupId);
    
    // Actualizar UI
    renderGroups();
    updateStats();
    saveToLocalStorage();
}

function toggleGroupExpanded(groupId) {
    if (expandedGroups.has(groupId)) {
        expandedGroups.delete(groupId);
    } else {
        expandedGroups.add(groupId);
    }
    
    // Actualizar UI
    renderGroups();
}

// Funciones de navegación de fechas
function navigateDay(offset) {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + offset);
    currentDate = newDate;
    currentDateString = formatDate(currentDate);
    
    // Actualizar UI
    updateDateDisplay();
    renderGroups();
    updateStats();
}

function updateDateDisplay() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDateEl.textContent = currentDate.toLocaleDateString('es-ES', options);
}

// Funciones de renderizado
function renderGroups() {
    // Limpiar contenedor
    groupsGrid.innerHTML = '';
    
    // Si no hay datos para este día, mostrar mensaje
    if (!todoData[currentDateString]) {
        todoData[currentDateString] = {};
    }
    
    // Renderizar cada grupo
    const groups = todoData[currentDateString];
    if (Object.keys(groups).length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.textContent = 'No hay grupos para este día.';
        emptyMessage.className = 'empty-message';
        groupsGrid.appendChild(emptyMessage);
        return;
    }
    
    for (const groupId in groups) {
        const group = groups[groupId];
        const isExpanded = expandedGroups.has(groupId);
        
        // Clonar la plantilla
        const groupNode = groupTemplate.content.cloneNode(true);
        const groupCard = groupNode.querySelector('.group-card');
        groupCard.dataset.groupId = groupId;
        
        // Configurar título
        groupNode.querySelector('.group-title').textContent = group.title;
        
        // Configurar botón de expansión
        const toggleBtn = groupNode.querySelector('.toggle-group-btn');
        toggleBtn.textContent = isExpanded ? '▼' : '►';
        toggleBtn.addEventListener('click', () => toggleGroupExpanded(groupId));
        
        // Configurar botón de eliminar
        groupNode.querySelector('.delete-group-btn').addEventListener('click', () => deleteGroup(groupId));
        
        // Ocultar contenido si no está expandido
        const groupContent = groupNode.querySelector('.group-content');
        groupContent.style.display = isExpanded ? 'block' : 'none';
        
        // Configurar creador de tareas
        const todoInput = groupNode.querySelector('.new-todo-input');
        const addTodoBtn = groupNode.querySelector('.add-todo-btn');
        
        addTodoBtn.addEventListener('click', () => {
            createNewTodo(groupId, todoInput.value.trim());
            todoInput.value = '';
        });
        
        todoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                createNewTodo(groupId, todoInput.value.trim());
                todoInput.value = '';
            }
        });
        
        // Añadir al contenedor
        groupsGrid.appendChild(groupNode);
        
        // Renderizar tareas si el grupo está expandido
        if (isExpanded) {
            renderTodos(groupId);
        }
    }
}

function renderTodos(groupId) {
    const group = todoData[currentDateString][groupId];
    if (!group) return;
    
    const todoList = document.querySelector(`.group-card[data-group-id="${groupId}"] .todo-list`);
    todoList.innerHTML = '';
    
    const todos = group.todos;
    if (Object.keys(todos).length === 0) {
        const emptyMessage = document.createElement('li');
        emptyMessage.textContent = 'No hay tareas en este grupo';
        emptyMessage.className = 'empty-todo-message';
        todoList.appendChild(emptyMessage);
        return;
    }
    
    for (const todoId in todos) {
        const todo = todos[todoId];
        
        // Clonar la plantilla
        const todoNode = todoTemplate.content.cloneNode(true);
        const todoItem = todoNode.querySelector('.todo-item');
        todoItem.dataset.todoId = todoId;
        
        // Configurar texto
        todoNode.querySelector('.todo-text').textContent = todo.text;
        
        // Configurar checkbox
        const checkbox = todoNode.querySelector('.todo-checkbox');
        checkbox.checked = todo.completed;
        if (todo.completed) {
            todoItem.classList.add('completed');
        }
        
        // Configurar fecha y tiempos
        const todoActions = todoNode.querySelector('.todo-actions');
        
        // Añadir tiempo de creación
        const createdTimeSpan = document.createElement('span');
        createdTimeSpan.className = 'todo-created-time';
        createdTimeSpan.title = 'Creado a las';
        createdTimeSpan.textContent = `📝 ${formatTime(new Date(todo.createdAt))}`;
        todoActions.insertBefore(createdTimeSpan, todoNode.querySelector('.delete-todo-btn'));
        
        // Añadir tiempo de completado si existe
        if (todo.completed && todo.completedAt) {
            const completedTimeSpan = document.createElement('span');
            completedTimeSpan.className = 'todo-completed-time';
            completedTimeSpan.title = 'Completado a las';
            completedTimeSpan.textContent = `✓ ${formatTime(new Date(todo.completedAt))}`;
            todoActions.insertBefore(completedTimeSpan, todoNode.querySelector('.delete-todo-btn'));
        }
        
        // Event listeners
        checkbox.addEventListener('change', function() {
            const todo = todoData[currentDateString][groupId].todos[todoId];
            todo.completed = this.checked;
            
            todoItem.classList.toggle('completed', this.checked);
            
            if (this.checked) {
                // Record completion time
                const completionTime = new Date();
                todo.completedAt = completionTime.toISOString();
                
                // Add completion time display
                let completedTimeSpan = todoItem.querySelector('.todo-completed-time');
                if (!completedTimeSpan) {
                    completedTimeSpan = document.createElement('span');
                    completedTimeSpan.className = 'todo-completed-time';
                    completedTimeSpan.title = 'Completado a las';
                    const todoActions = todoItem.querySelector('.todo-actions');
                    todoActions.insertBefore(completedTimeSpan, todoItem.querySelector('.delete-todo-btn'));
                }
                completedTimeSpan.textContent = `✓ ${formatTime(completionTime)}`;
            } else {
                // Remove completion time
                delete todo.completedAt;
                const completedTimeSpan = todoItem.querySelector('.todo-completed-time');
                if (completedTimeSpan) {
                    completedTimeSpan.remove();
                }
            }
            
            // Save changes
            saveToLocalStorage();
            updateStats();
        });
        
        // Configurar botón de eliminar
        todoNode.querySelector('.delete-todo-btn').addEventListener('click', () => deleteTodo(groupId, todoId));
        
        // Añadir al contenedor
        todoList.appendChild(todoNode);
    }
}

// Funciones para estadísticas
function updateStats() {
    let totalTasks = 0;
    let completedTasks = 0;
    
    if (todoData[currentDateString]) {
        const groups = todoData[currentDateString];
        
        for (const groupId in groups) {
            const todos = groups[groupId].todos;
            
            for (const todoId in todos) {
                totalTasks++;
                if (todos[todoId].completed) {
                    completedTasks++;
                }
            }
        }
    }
    
    // Actualizar elementos UI
    totalTasksEl.textContent = totalTasks;
    completedTasksEl.textContent = completedTasks;
    
    // Calcular tasa de finalización
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    completionRateEl.textContent = `${completionRate}%`;
}

// Funciones de almacenamiento local
function saveToLocalStorage() {
    localStorage.setItem('todoData', JSON.stringify(todoData));
}

function loadFromLocalStorage() {
    const savedData = localStorage.getItem('todoData');
    if (savedData) {
        const parsedData = JSON.parse(savedData);
        Object.assign(todoData, parsedData);
    }
}

// Funciones de utilidad
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper function to format time as HH:MM
function formatTime(date) {
    return date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
}

// Function to copy groups from the previous day
function copyGroupsFromPreviousDay() {
    const previousDate = new Date(currentDate);
    previousDate.setDate(previousDate.getDate() - 1);
    const previousDateString = formatDate(previousDate);
    
    if (!todoData[previousDateString]) {
        alert('No hay grupos para copiar del día anterior.');
        return;
    }
    
    // Initialize current date if needed
    if (!todoData[currentDateString]) {
        todoData[currentDateString] = {};
    }
    
    // Copy groups structure without tasks
    const previousGroups = todoData[previousDateString];
    for (const groupId in previousGroups) {
        const newGroupId = 'group_' + Date.now() + Math.random().toString(36).substr(2, 5);
        todoData[currentDateString][newGroupId] = {
            title: previousGroups[groupId].title,
            todos: {}
        };
        expandedGroups.add(newGroupId);
    }
    
    // Update UI
    renderGroups();
    saveToLocalStorage();
}

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    init();
});
