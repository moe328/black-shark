// 1. Page elements and app state.
const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const taskPriority = document.getElementById("task-priority");
const searchInput = document.getElementById("search-input");
const taskList = document.getElementById("task-list");
const statusMessage = document.getElementById("status");
const storageKey = "simple-todo-tasks";

let tasks = loadTasks();
let activeFilter = "all";
let searchText = "";
let editingId = null;

// 2. Keep tasks in this browser between visits.
function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (!Array.isArray(saved)) return [];
    return saved.filter(task => task && typeof task.id === "string"
      && typeof task.text === "string" && typeof task.completed === "boolean"
      && ["low", "medium", "high"].includes(task.priority));
  } catch {
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(tasks));
    statusMessage.textContent = "";
  } catch {
    statusMessage.textContent = "Tasks work for this visit, but could not be saved in this browser.";
  }
}

// 3. Add tasks, search, and switch filters.
taskForm.addEventListener("submit", event => {
  event.preventDefault();
  const text = taskInput.value.trim();
  if (!text) {
    alert("Please enter a task name.");
    taskInput.focus();
    return;
  }

  tasks.push({ id: crypto.randomUUID(), text, priority: taskPriority.value, completed: false });
  taskInput.value = "";
  searchInput.value = "";
  searchText = "";
  activeFilter = "all";
  saveTasks();
  renderTasks();
  taskInput.focus();
});

document.getElementById("search-form").addEventListener("submit", event => {
  event.preventDefault();
  searchText = searchInput.value.trim().toLowerCase();
  renderTasks();
});

// Filter immediately while typing. Clearing the input shows tasks again.
searchInput.addEventListener("input", () => {
  searchText = searchInput.value.trim().toLowerCase();
  renderTasks();
});

document.querySelectorAll("[data-filter]").forEach(button => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    renderTasks();
  });
});

// Clear every task, including tasks hidden by search or filters.
document.getElementById("clear-all").addEventListener("click", () => {
  tasks = [];
  editingId = null;
  searchInput.value = "";
  searchText = "";
  activeFilter = "all";
  saveTasks();
  renderTasks();
});

// 4. Build the visible list. Task text uses textContent to display safely.
function renderTasks() {
  taskList.replaceChildren();
  document.querySelectorAll("[data-filter]").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.filter === activeFilter));
  });

  const visibleTasks = tasks.filter(task => {
    const matchesFilter = activeFilter === "all"
      || (activeFilter === "completed" && task.completed)
      || (activeFilter === "uncompleted" && !task.completed);
    return matchesFilter && task.text.toLowerCase().includes(searchText);
  });

  visibleTasks.forEach(task => {
    const row = document.createElement("li");
    row.className = task.completed ? "task completed" : "task";
    row.innerHTML = `
      <input class="task-check" type="checkbox">
      <label class="task-title" dir="auto"></label>
      <div class="task-actions">
        <select aria-label="Task priority">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button type="button" class="edit-button">Edit</button>
        <button type="button" class="delete-button">Delete</button>
      </div>`;

    const checkbox = row.querySelector(".task-check");
    const title = row.querySelector(".task-title");
    const priority = row.querySelector("select");
    checkbox.id = "task-" + task.id;
    checkbox.checked = task.completed;
    title.htmlFor = checkbox.id;
    title.textContent = task.text;
    priority.value = task.priority;
    priority.className = "priority-" + task.priority;

    checkbox.addEventListener("change", () => {
      task.completed = checkbox.checked;
      saveTasks();
      renderTasks();
    });
    priority.addEventListener("change", () => {
      task.priority = priority.value;
      priority.className = "priority-" + task.priority;
      saveTasks();
    });
    row.querySelector(".delete-button").addEventListener("click", () => {
      tasks = tasks.filter(item => item.id !== task.id);
      saveTasks();
      renderTasks();
    });
    row.querySelector(".edit-button").addEventListener("click", () => {
      editingId = task.id;
      renderTasks();
      taskList.querySelector(".edit-input").focus();
    });

    if (editingId === task.id) showEditInput(row, task);
    taskList.appendChild(row);
  });

  const remaining = tasks.filter(task => !task.completed).length;
  document.getElementById("task-count").textContent = `${remaining} task${remaining === 1 ? "" : "s"} left`;
  const emptyMessage = document.getElementById("empty-message");
  emptyMessage.hidden = visibleTasks.length > 0;
  emptyMessage.textContent = tasks.length === 0
    ? "No tasks yet."
    : "No matching tasks.";
}

// 5. Edit in place. Enter saves, Escape or Cancel discards the edit.
function showEditInput(row, task) {
  const input = document.createElement("input");
  input.className = "edit-input";
  input.value = task.text;
  input.maxLength = 200;
  input.setAttribute("aria-label", "Edit task name");
  row.querySelector(".task-title").replaceWith(input);
  row.querySelector(".task-check").setAttribute("aria-label", task.text);
  const actions = row.querySelector(".task-actions");
  actions.replaceChildren();
  const saveButton = document.createElement("button");
  saveButton.textContent = "Save";
  saveButton.className = "primary";
  const cancelButton = document.createElement("button");
  cancelButton.textContent = "Cancel";
  actions.append(saveButton, cancelButton);

  function finishEdit(save) {
    if (save && !input.value.trim()) {
      input.setCustomValidity("Please enter a task name.");
      input.reportValidity();
      return;
    }
    if (save) {
      task.text = input.value.trim();
      saveTasks();
    }
    editingId = null;
    renderTasks();
  }

  input.addEventListener("input", () => input.setCustomValidity(""));
  saveButton.addEventListener("click", () => finishEdit(true));
  cancelButton.addEventListener("click", () => finishEdit(false));
  input.addEventListener("keydown", event => {
    if (event.key === "Enter") finishEdit(true);
    if (event.key === "Escape") finishEdit(false);
  });
}

renderTasks();
