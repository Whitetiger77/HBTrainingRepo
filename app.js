const STORAGE_KEY = "daily-work-time-manager.tasks";

// This object holds the current app state.
const state = {
  tasks: [],
  activeTaskId: null,
  timerStart: null,
};

// Grab the page elements we need.
const taskForm = document.getElementById("task-form");
const taskList = document.getElementById("task-list");
const summaryText = document.getElementById("summary-text");
const completedCount = document.getElementById("completed-count");
const activeCount = document.getElementById("active-count");
const totalTime = document.getElementById("total-time");

function loadState() {
  const savedItems = localStorage.getItem(STORAGE_KEY);

  if (!savedItems) {
    return;
  }

  try {
    const parsed = JSON.parse(savedItems);
    state.tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
    state.activeTaskId = parsed.activeTaskId || null;
    state.timerStart = parsed.timerStart || null;
  } catch (error) {
    console.error("Unable to load saved tasks", error);
  }
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      tasks: state.tasks,
      activeTaskId: state.activeTaskId,
      timerStart: state.timerStart,
    })
  );
}

function formatDuration(totalSeconds) {
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function getTaskElapsed(task) {
  if (state.activeTaskId === task.id && state.timerStart) {
    const secondsSinceStart = Math.floor((Date.now() - state.timerStart) / 1000);
    return task.elapsed + secondsSinceStart;
  }

  return task.elapsed;
}

function render() {
  taskList.innerHTML = "";

  if (!state.tasks.length) {
    taskList.innerHTML = '<p class="empty-state">No tasks yet. Add one above to begin your day.</p>';
    summaryText.textContent = "No tasks yet. Add one to get started.";
    completedCount.textContent = "0";
    activeCount.textContent = "0";
    totalTime.textContent = "00:00:00";
    return;
  }

  const completedTasks = state.tasks.filter((task) => task.completed).length;
  const openTasks = state.tasks.filter((task) => !task.completed).length;
  const trackedTime = state.tasks.reduce((sum, task) => sum + getTaskElapsed(task), 0);

  summaryText.textContent = `${completedTasks} completed, ${openTasks} still open, ${formatDuration(trackedTime)} tracked today.`;
  completedCount.textContent = String(completedTasks);
  activeCount.textContent = String(openTasks);
  totalTime.textContent = formatDuration(trackedTime);

  const taskCards = document.createElement("div");
  taskCards.className = "task-list";

  state.tasks.forEach((task) => {
    const card = document.createElement("article");
    card.className = `task-card${task.completed ? " completed" : ""}`;

    const elapsed = getTaskElapsed(task);
    const isActive = state.activeTaskId === task.id;

    card.innerHTML = `
      <main>
        <div class="task-title">${task.title}</div>
        <div class="task-meta">${task.category} • ${task.priority} • Estimate ${task.estimate} min • Time ${formatDuration(elapsed)}</div>
      </main>
      <div class="task-actions">
        <label class="checkbox-row">
          <input type="checkbox" class="task-checkbox" data-id="${task.id}" ${task.completed ? "checked" : ""} />
          <span>Done</span>
        </label>
        <button class="secondary" data-action="start" data-id="${task.id}">
          ${isActive ? "Pause" : "Start"}
        </button>
        <button class="danger" data-action="reset" data-id="${task.id}">Reset</button>
      </div>
    `;

    taskCards.appendChild(card);
  });

  taskList.appendChild(taskCards);
}

function createTaskFromForm(event) {
  event.preventDefault();

  const title = document.getElementById("task-title").value.trim();
  const category = document.getElementById("task-category").value;
  const priority = document.getElementById("task-priority").value;
  const estimate = Number(document.getElementById("task-estimate").value || 30);

  if (!title) {
    return;
  }

  const newTask = {
    id: String(Date.now()),
    title,
    category,
    priority,
    estimate,
    elapsed: 0,
    completed: false,
  };

  state.tasks.unshift(newTask);

  taskForm.reset();
  document.getElementById("task-estimate").value = "30";
  saveState();
  render();
}

function pauseActiveTask() {
  if (!state.activeTaskId || !state.timerStart) {
    return;
  }

  const activeTask = state.tasks.find((task) => task.id === state.activeTaskId);

  if (activeTask) {
    const secondsSinceStart = Math.floor((Date.now() - state.timerStart) / 1000);
    activeTask.elapsed += secondsSinceStart;
  }

  state.activeTaskId = null;
  state.timerStart = null;
  saveState();
}

function toggleTaskTimer(taskId) {
  if (state.activeTaskId && state.activeTaskId !== taskId) {
    pauseActiveTask();
  }

  if (state.activeTaskId === taskId) {
    pauseActiveTask();
    render();
    return;
  }

  const task = state.tasks.find((item) => item.id === taskId);

  if (!task) {
    return;
  }

  state.activeTaskId = task.id;
  state.timerStart = Date.now();
  saveState();
  render();
}

function toggleTaskCompletion(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);

  if (!task) {
    return;
  }

  task.completed = !task.completed;

  if (task.completed && state.activeTaskId === task.id) {
    pauseActiveTask();
  }

  saveState();
  render();
}

function resetTask(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);

  if (!task) {
    return;
  }

  if (state.activeTaskId === task.id) {
    pauseActiveTask();
  }

  task.elapsed = 0;
  saveState();
  render();
}

function handleTaskListClick(event) {
  const button = event.target.closest("button");
  const checkbox = event.target.closest(".task-checkbox");

  if (checkbox) {
    toggleTaskCompletion(checkbox.dataset.id);
    return;
  }

  if (!button) {
    return;
  }

  const action = button.dataset.action;
  const taskId = button.dataset.id;

  if (action === "start") {
    toggleTaskTimer(taskId);
  }

  if (action === "reset") {
    resetTask(taskId);
  }
}

// Load saved tasks after the page and scripts are ready.
loadState();
render();

// Keep the display fresh every second.
setInterval(() => {
  render();
}, 1000);

taskForm.addEventListener("submit", createTaskFromForm);
taskList.addEventListener("click", handleTaskListClick);
