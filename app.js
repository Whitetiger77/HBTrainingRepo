const STORAGE_KEY = "daily-work-time-manager.tasks";
const STORAGE_VERSION = 2;
const state = { tasks: [], activeTaskId: null, timerStart: null, timerEnd: null };
let taskView = "today";
// One task at a time can be in edit mode or waiting for delete confirmation.
// The draft lives here so the list can be rebuilt without losing typed text.
let editing = null;
let confirmDeleteId = null;
let focusRequest = null;
const CATEGORIES = ["Deep work", "Meetings", "Admin", "Learning"];
const PRIORITIES = ["High", "Medium", "Low"];

const taskForm = document.getElementById("task-form");
const taskList = document.getElementById("task-list");
const summaryText = document.getElementById("summary-text");
const completedCount = document.getElementById("completed-count");
const activeCount = document.getElementById("active-count");
const totalTime = document.getElementById("total-time");
const taskHeading = document.getElementById("task-heading");
const todayButton = document.getElementById("view-today");
const historyButton = document.getElementById("view-history");
const dayNote = document.getElementById("day-note");

// Use the browser's local calendar, not a UTC date string.
function dayKey(timestamp = Date.now()) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function nextMidnight(timestamp) {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
}
function nonnegative(value) {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}
function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const parsed = JSON.parse(saved);
    const legacy = parsed.version !== STORAGE_VERSION;
    state.tasks = (Array.isArray(parsed.tasks) ? parsed.tasks : [])
      .filter(task => task && typeof task.id === "string")
      .map(task => ({
        ...task,
        completed: Boolean(task.completed),
        createdOn: typeof task.createdOn === "string" ? task.createdOn : null,
        completedOn: typeof task.completedOn === "string" ? task.completedOn : null,
        undatedMs: legacy ? nonnegative(task.elapsed) * 1000 : nonnegative(task.undatedMs),
        timeByDay: legacy ? {} : Object.fromEntries(Object.entries(task.timeByDay || {})
          .filter(([day, ms]) => /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(ms) && ms >= 0)),
      }));
    const active = state.tasks.find(task => task.id === parsed.activeTaskId && !task.completed);
    if (active && Number.isFinite(parsed.timerStart) && parsed.timerStart > 0) {
      state.activeTaskId = active.id;
      state.timerStart = parsed.timerStart;
      state.timerEnd = !legacy && Number.isFinite(parsed.timerEnd) && parsed.timerEnd > parsed.timerStart
        ? parsed.timerEnd : nextMidnight(parsed.timerStart);
    }
    // Legacy totals have no work dates. Keep them undated. A saved running
    // interval has a known start and can be dated without guessing.
    stopAtDayBoundary();
    if (legacy) saveState();
  } catch (error) {
    console.error("Unable to load saved tasks", error);
  }
}
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, ...state }));
}
function formatDuration(totalSeconds) {
  const seconds = Math.floor(nonnegative(totalSeconds));
  return [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60]
    .map(value => String(value).padStart(2, "0")).join(":");
}
function currentIntervalMs(task, now = Date.now()) {
  if (state.activeTaskId !== task.id || state.timerStart === null) return 0;
  return Math.max(0, Math.min(now, state.timerEnd) - state.timerStart);
}
function taskDayMs(task, day, now = Date.now()) {
  const current = state.timerStart !== null && dayKey(state.timerStart) === day
    ? currentIntervalMs(task, now) : 0;
  return nonnegative(task.timeByDay[day]) + current;
}
function taskTotalMs(task, now = Date.now()) {
  return task.undatedMs + Object.values(task.timeByDay).reduce((sum, ms) => sum + ms, 0) + currentIntervalMs(task, now);
}
function pauseActiveTask(now = Date.now()) {
  if (state.activeTaskId === null || state.timerStart === null) return;
  const task = state.tasks.find(item => item.id === state.activeTaskId);
  if (task) {
    const day = dayKey(state.timerStart);
    task.timeByDay[day] = nonnegative(task.timeByDay[day]) + currentIntervalMs(task, now);
  }
  state.activeTaskId = null;
  state.timerStart = null;
  state.timerEnd = null;
  saveState();
}
function stopAtDayBoundary(now = Date.now()) {
  if (state.timerEnd !== null && now >= state.timerEnd) pauseActiveTask(now);
}
function appendText(parent, className, text) {
  const element = document.createElement("div");
  element.className = className;
  element.textContent = text;
  parent.appendChild(element);
  return element;
}
function render(options = {}) {
  const now = Date.now();
  stopAtDayBoundary(now);
  const today = dayKey(now);
  const completed = state.tasks.filter(task => task.completed && task.completedOn === today).length;
  const open = state.tasks.filter(task => !task.completed).length;
  const trackedMs = state.tasks.reduce((sum, task) => sum + taskDayMs(task, today, now), 0);
  summaryText.textContent = `${completed} completed today, ${open} still open, ${formatDuration(trackedMs / 1000)} tracked today.`;
  completedCount.textContent = String(completed);
  activeCount.textContent = String(open);
  totalTime.textContent = formatDuration(trackedMs / 1000);
  taskHeading.textContent = taskView === "today" ? "Today's tasks" : "Task history";
  todayButton.setAttribute("aria-pressed", String(taskView === "today"));
  historyButton.setAttribute("aria-pressed", String(taskView === "history"));
  dayNote.textContent = `${today} (device local date). Task timers stop at midnight. History keeps earlier and undated time. The summary always shows today.`;
  // Rebuilding the list every second would wipe an open edit field, so the
  // timer tick leaves the list alone while a task is being edited or a delete
  // is waiting for confirmation. Any click or key press still rebuilds it.
  if (options.fromTick && (editing || confirmDeleteId)) return;
  taskList.replaceChildren();
  const visible = taskView === "history" ? state.tasks : state.tasks.filter(task => !task.completed || task.completedOn === today);
  if (!visible.length) {
    appendText(taskList, "empty-state", taskView === "history" ? "No saved history yet." : "No tasks for today. Add one above or check History.");
    return;
  }
  const cards = document.createElement("div");
  cards.className = "task-list";
  visible.forEach(task => {
    if (editing && editing.id === task.id) { cards.appendChild(buildEditCard(task)); return; }
    const card = document.createElement("article");
    card.className = `task-card${task.completed ? " completed" : ""}`;
    const content = document.createElement("div");
    content.className = "task-content";
    // Render all saved task values as plain text.
    appendText(content, "task-title", task.title);
    appendText(content, "task-meta", `${task.category} • ${task.priority} • Estimate ${task.estimate} min`);
    appendText(content, "task-meta", `Today ${formatDuration(taskDayMs(task, today, now) / 1000)} • All time ${formatDuration(taskTotalMs(task, now) / 1000)}`);
    if (taskView === "history") {
      appendText(content, "task-meta", task.completed ? `Completed: ${task.completedOn || "date unknown (older task)"}` : "Open (also on Today's tasks)");
      const days = new Set(Object.keys(task.timeByDay));
      if (state.activeTaskId === task.id && state.timerStart !== null) days.add(dayKey(state.timerStart));
      [...days].sort().reverse().forEach(day => {
        appendText(content, "task-meta", `${day}: ${formatDuration(taskDayMs(task, day, now) / 1000)}`);
      });
      if (task.undatedMs > 0) appendText(content, "task-meta", `Older undated time: ${formatDuration(task.undatedMs / 1000)}`);
    }
    card.appendChild(content);
    const actions = document.createElement("div");
    actions.className = "task-actions";
    const label = document.createElement("label");
    label.className = "checkbox-row";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.dataset.id = task.id;
    checkbox.checked = task.completed;
    const labelText = document.createElement("span");
    labelText.textContent = "Done";
    label.append(checkbox, labelText);
    actions.appendChild(label);
    for (const [action, text, className] of [
      ["start", state.activeTaskId === task.id ? "Pause" : "Start", "secondary"],
      ["reset", "Reset today", "danger"],
      ["edit", "Edit", "secondary"],
      ["delete", "Delete", "danger"],
    ]) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.action = action;
      button.dataset.id = task.id;
      button.className = className;
      button.textContent = text;
      button.disabled = action === "start" && task.completed;
      actions.appendChild(button);
    }
    card.appendChild(actions);
    cards.appendChild(card);
    if (confirmDeleteId === task.id) cards.appendChild(buildDeleteConfirm(task, now));
  });
  taskList.appendChild(cards);
  if (focusRequest) {
    const target = taskList.querySelector(focusRequest);
    focusRequest = null;
    if (target) target.focus();
  }
}
function field(labelText, control) {
  const label = document.createElement("label");
  label.append(labelText, control);
  return label;
}
function buildEditCard(task) {
  const form = document.createElement("form");
  form.className = "task-card editing edit-form";
  form.noValidate = true;
  const title = document.createElement("input");
  title.type = "text"; title.name = "title"; title.required = true; title.value = editing.title;
  const category = document.createElement("select");
  category.name = "category";
  // Keep a saved value even if it is not one of the standard options.
  [...new Set([...CATEGORIES, editing.category])].forEach(value => category.add(new Option(value, value)));
  category.value = editing.category;
  const priority = document.createElement("select");
  priority.name = "priority";
  [...new Set([...PRIORITIES, editing.priority])].forEach(value => priority.add(new Option(value, value)));
  priority.value = editing.priority;
  const estimate = document.createElement("input");
  estimate.type = "number"; estimate.name = "estimate"; estimate.min = "1"; estimate.step = "1"; estimate.value = editing.estimate;
  const error = document.createElement("p");
  error.className = "edit-error";
  error.setAttribute("role", "alert");
  error.textContent = editing.error || "";
  const buttons = document.createElement("div");
  buttons.className = "task-actions";
  const save = document.createElement("button");
  save.type = "submit"; save.className = "btn-primary"; save.textContent = "Save changes";
  const cancel = document.createElement("button");
  cancel.type = "button"; cancel.className = "secondary"; cancel.dataset.action = "cancel-edit"; cancel.textContent = "Cancel";
  buttons.append(save, cancel);
  form.append(field("Task title", title), field("Category", category), field("Priority", priority),
    field("Estimate (minutes)", estimate), error, buttons);
  form.addEventListener("input", () => {
    editing.title = title.value; editing.category = category.value;
    editing.priority = priority.value; editing.estimate = estimate.value;
  });
  form.addEventListener("submit", event => { event.preventDefault(); saveEdit(); });
  if (!focusRequest) focusRequest = ".edit-form input[name=title]";
  return form;
}
function buildDeleteConfirm(task, now) {
  const box = document.createElement("div");
  box.className = "delete-confirm";
  box.setAttribute("role", "alert");
  const total = formatDuration(taskTotalMs(task, now) / 1000);
  const running = state.activeTaskId === task.id ? " Its running timer will stop." : "";
  appendText(box, "delete-text", `Delete this task and its ${total} of tracked time? This cannot be undone, and the time leaves your totals.${running}`);
  const buttons = document.createElement("div");
  buttons.className = "task-actions";
  const confirm = document.createElement("button");
  confirm.type = "button"; confirm.className = "danger"; confirm.dataset.action = "confirm-delete"; confirm.dataset.id = task.id;
  confirm.textContent = "Delete task";
  const cancel = document.createElement("button");
  cancel.type = "button"; cancel.className = "secondary"; cancel.dataset.action = "cancel-delete"; cancel.textContent = "Keep task";
  buttons.append(confirm, cancel);
  box.appendChild(buttons);
  if (!focusRequest) focusRequest = "[data-action=cancel-delete]";
  return box;
}
function startEdit(taskId) {
  const task = state.tasks.find(item => item.id === taskId);
  if (!task) return;
  confirmDeleteId = null;
  editing = { id: task.id, title: task.title, category: task.category, priority: task.priority, estimate: String(task.estimate), error: "" };
  render();
}
function cancelEdit() {
  const id = editing && editing.id;
  editing = null;
  if (id) focusRequest = `button[data-action=edit][data-id="${id}"]`;
  render();
}
function saveEdit() {
  if (!editing) return;
  const task = state.tasks.find(item => item.id === editing.id);
  if (!task) { editing = null; render(); return; }
  const title = editing.title.trim();
  const estimate = Number(editing.estimate);
  const problem = !title ? "Enter a task title."
    : !Number.isInteger(estimate) || estimate < 1 ? "Estimate must be a whole number of minutes, 1 or more." : "";
  if (problem) { editing.error = problem; focusRequest = ".edit-form input[name=title]"; render(); return; }
  // Only descriptive fields change. Time, dates, completion and the running timer are untouched.
  task.title = title; task.category = editing.category; task.priority = editing.priority; task.estimate = estimate;
  saveState();
  cancelEdit();
}
function askDelete(taskId) {
  editing = null;
  confirmDeleteId = taskId;
  render();
}
function deleteTask(taskId) {
  stopAtDayBoundary();
  confirmDeleteId = null;
  const index = state.tasks.findIndex(item => item.id === taskId);
  if (index === -1) { render(); return; }
  if (state.activeTaskId === taskId) {
    // The task is going away, so its running interval is discarded with it.
    state.activeTaskId = null; state.timerStart = null; state.timerEnd = null;
  }
  state.tasks.splice(index, 1);
  saveState();
  focusRequest = "#task-list button";
  render();
}
function createTaskFromForm(event) {
  event.preventDefault();
  stopAtDayBoundary();
  const title = document.getElementById("task-title").value.trim();
  if (!title) return;
  state.tasks.unshift({
    id: String(Date.now()), title,
    category: document.getElementById("task-category").value,
    priority: document.getElementById("task-priority").value,
    estimate: Number(document.getElementById("task-estimate").value || 30),
    completed: false, createdOn: dayKey(), completedOn: null, timeByDay: {}, undatedMs: 0,
  });
  taskForm.reset();
  document.getElementById("task-estimate").value = "30";
  saveState();
  render();
}
function toggleTaskTimer(taskId) {
  stopAtDayBoundary();
  const task = state.tasks.find(item => item.id === taskId);
  if (!task || task.completed) return;
  if (state.activeTaskId === taskId) {
    pauseActiveTask();
  } else {
    pauseActiveTask();
    state.activeTaskId = taskId;
    state.timerStart = Date.now();
    state.timerEnd = nextMidnight(state.timerStart);
    saveState();
  }
  render();
}
function toggleTaskCompletion(taskId) {
  stopAtDayBoundary();
  const task = state.tasks.find(item => item.id === taskId);
  if (!task) return;
  if (state.activeTaskId === task.id) pauseActiveTask();
  task.completed = !task.completed;
  task.completedOn = task.completed ? dayKey() : null;
  saveState();
  render();
}
function resetTask(taskId) {
  stopAtDayBoundary();
  const task = state.tasks.find(item => item.id === taskId);
  if (!task) return;
  if (state.activeTaskId === task.id) pauseActiveTask();
  delete task.timeByDay[dayKey()];
  saveState();
  render();
}
function handleTaskListClick(event) {
  const checkbox = event.target.closest(".task-checkbox");
  if (checkbox) { toggleTaskCompletion(checkbox.dataset.id); return; }
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.action === "start") toggleTaskTimer(button.dataset.id);
  if (button.dataset.action === "reset") resetTask(button.dataset.id);
  if (button.dataset.action === "edit") startEdit(button.dataset.id);
  if (button.dataset.action === "cancel-edit") cancelEdit();
  if (button.dataset.action === "delete") askDelete(button.dataset.id);
  if (button.dataset.action === "confirm-delete") deleteTask(button.dataset.id);
  if (button.dataset.action === "cancel-delete") {
    const id = confirmDeleteId;
    confirmDeleteId = null;
    if (id) focusRequest = `button[data-action=delete][data-id="${id}"]`;
    render();
  }
}
for (const [button, view] of [[todayButton, "today"], [historyButton, "history"]]) {
  button.addEventListener("click", () => { taskView = view; render(); });
}

// The Pomodoro timer runs separately from task time tracking.
const pomodoro = {
  mode: "focus",
  completedSessions: 0,
  remainingMs: 25 * 60 * 1000,
  endsAt: null,
  paused: false,
};

const pomodoroMode = document.getElementById("pomodoro-mode");
const pomodoroTime = document.getElementById("pomodoro-time");
const pomodoroStatus = document.getElementById("pomodoro-status");
const pomodoroStart = document.getElementById("pomodoro-start");
const pomodoroReset = document.getElementById("pomodoro-reset");

// Announce status changes, not every second of the countdown.
pomodoroStatus.setAttribute("role", "status");
pomodoroStatus.setAttribute("aria-live", "polite");

// A short, generated chime needs no downloaded audio file.
let pomodoroAudio = null;
let pomodoroSoundEnabled = true;

const soundActions = document.createElement("div");
soundActions.className = "pomodoro-actions";
const soundToggle = document.createElement("button");
soundToggle.type = "button";
soundToggle.className = "btn-secondary";
soundToggle.textContent = "Sound: On";
soundToggle.setAttribute("aria-pressed", "true");
const soundTest = document.createElement("button");
soundTest.type = "button";
soundTest.className = "btn-secondary";
soundTest.textContent = "Test sound";
soundActions.append(soundToggle, soundTest);
pomodoroReset.parentElement.after(soundActions);
const soundNote = document.createElement("p");
soundNote.className = "muted";
soundNote.textContent = "Sound plays at the end of focus and breaks. Keep this page open and your device unmuted.";
soundActions.after(soundNote);

function preparePomodoroAudio() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      return Promise.resolve(false);
    }
    if (!pomodoroAudio || pomodoroAudio.state === "closed") {
      pomodoroAudio = new AudioContext();
    }
    // Called from a button click to satisfy browser autoplay rules.
    return pomodoroAudio.resume().then(() => pomodoroAudio.state === "running").catch(() => false);
  } catch (error) {
    return Promise.resolve(false);
  }
}

function playPomodoroChime() {
  if (!pomodoroAudio || pomodoroAudio.state !== "running") {
    return false;
  }

  try {
    [0, 0.4, 0.8].forEach((offset) => {
      const start = pomodoroAudio.currentTime + offset;
      const oscillator = pomodoroAudio.createOscillator();
      const gain = pomodoroAudio.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.15, start + 0.02);
      gain.gain.linearRampToValueAtTime(0, start + 0.25);
      oscillator.connect(gain);
      gain.connect(pomodoroAudio.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.26);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    });
    return true;
  } catch (error) {
    return false;
  }
}

soundToggle.addEventListener("click", () => {
  pomodoroSoundEnabled = !pomodoroSoundEnabled;
  soundToggle.textContent = pomodoroSoundEnabled ? "Sound: On" : "Sound: Off";
  soundToggle.setAttribute("aria-pressed", String(pomodoroSoundEnabled));
  if (pomodoroSoundEnabled) {
    preparePomodoroAudio();
  }
});
soundTest.addEventListener("click", async () => {
  const ready = await preparePomodoroAudio();
  soundNote.textContent = ready && playPomodoroChime()
    ? "Test chime played. Keep this page open and your device unmuted."
    : "Sound is unavailable or blocked. The timer still works; watch the on-screen status.";
});

function renderPomodoro() {
  const seconds = Math.ceil(pomodoro.remainingMs / 1000);
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const remainder = String(seconds % 60).padStart(2, "0");
  pomodoroTime.textContent = `${minutes}:${remainder}`;
  pomodoroMode.textContent = pomodoro.mode === "focus"
    ? "Focus session"
    : pomodoro.mode === "shortBreak" ? "Short break" : "Long break";
  pomodoroStart.textContent = pomodoro.endsAt !== null
    ? "Pause"
    : pomodoro.paused ? "Resume" : "Start";
}

function finishPomodoro() {
  pomodoro.endsAt = null;
  pomodoro.paused = false;

  if (pomodoro.mode === "focus") {
    pomodoro.completedSessions += 1;
    const longBreak = pomodoro.completedSessions % 4 === 0;
    pomodoro.mode = longBreak ? "longBreak" : "shortBreak";
    pomodoro.remainingMs = (longBreak ? 15 : 5) * 60 * 1000;
    pomodoroStatus.textContent = `Focus complete! ${longBreak ? "15" : "5"}-minute break ready. Press Start when ready.`;
  } else {
    pomodoro.mode = "focus";
    pomodoro.remainingMs = 25 * 60 * 1000;
    pomodoroStatus.textContent = "Break complete! Next focus session ready. Press Start when ready.";
  }

  pomodoroStart.textContent = "Start";
  if (pomodoroSoundEnabled && !playPomodoroChime()) {
    pomodoroStatus.textContent += " Sound unavailable; use Test sound to check it.";
  }
}

function updatePomodoro() {
  if (pomodoro.endsAt !== null) {
    // Use elapsed wall-clock time so background tabs do not slow the timer.
    pomodoro.remainingMs = Math.max(0, pomodoro.endsAt - Date.now());

    if (pomodoro.remainingMs === 0) {
      finishPomodoro();
    }
  }

  renderPomodoro();
}

function togglePomodoro() {
  const wasRunning = pomodoro.endsAt !== null;
  updatePomodoro();

  if (wasRunning) {
    // A click after time runs out should leave the next phase ready, not start it.
    if (pomodoro.endsAt !== null) {
      pomodoro.endsAt = null;
      pomodoro.paused = true;
      pomodoroStatus.textContent = "Paused. Press Resume to continue.";
    }
  } else {
    if (pomodoroSoundEnabled) {
      preparePomodoroAudio();
    }
    pomodoro.paused = false;
    pomodoro.endsAt = Date.now() + pomodoro.remainingMs;
    pomodoroStatus.textContent = pomodoro.mode === "focus"
      ? "Focus time. One thing at a time."
      : "Take a break. The next focus session can wait.";
  }

  renderPomodoro();
}

function resetPomodoro() {
  pomodoro.mode = "focus";
  pomodoro.completedSessions = 0;
  pomodoro.remainingMs = 25 * 60 * 1000;
  pomodoro.endsAt = null;
  pomodoro.paused = false;
  pomodoroStart.textContent = "Start";
  pomodoroStatus.textContent = "Ready to begin. Reset starts a new four-session cycle.";
  renderPomodoro();
}

pomodoroStart.addEventListener("click", togglePomodoro);
pomodoroReset.addEventListener("click", resetPomodoro);
document.addEventListener("visibilitychange", updatePomodoro);
renderPomodoro();

// Restore tasks and reconcile any saved timer with its midnight deadline.
loadState();
render();
setInterval(() => { render({ fromTick: true }); updatePomodoro(); }, 1000);
document.addEventListener("visibilitychange", render);
taskForm.addEventListener("submit", createTaskFromForm);
taskList.addEventListener("click", handleTaskListClick);
taskList.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  if (editing) cancelEdit();
  else if (confirmDeleteId) { const id = confirmDeleteId; confirmDeleteId = null; focusRequest = `button[data-action=delete][data-id="${id}"]`; render(); }
});
