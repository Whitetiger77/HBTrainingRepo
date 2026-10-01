# Workday Time Manager

A browser-based learning project for planning tasks and tracking time. It uses plain HTML, CSS, and JavaScript, with local browser storage for tasks. It is a work in progress, not a finished QA portfolio showcase.

## Current features

### Tasks and time tracking

- Add a task with a plain-text title, category, priority, and time estimate
- Start and pause a task timer, with one active task at a time
- Reset only a task's time for today, without erasing earlier or undated time
- Carry unfinished tasks into today and keep saved tasks in a History view
- See tasks completed today, all currently open tasks, and time tracked today
- Keep per-day time and separate older undated totals
- Save tasks and task-timer state in `localStorage`

### Daily behavior and History

Days follow the device's local calendar. Midnight ends the day. A running task timer stops at that midnight boundary; press Start to work on the next day. If the tab is asleep or closed, the app applies the same cutoff when it next runs, without adding time for later days. Within the same day, a task timer still counts elapsed wall-clock time while the page is closed. This is not idle detection: pause it when you stop working.

Today's list contains unfinished tasks, including those carried over from earlier days, and tasks completed today. Earlier completed tasks are hidden from Today but kept in History. History shows all saved tasks, their recorded daily time, and any older undated time. Unchecking Done on a completed task returns it to Today's open list. A completed task must be reopened before its timer can start.

The summary always shows today, even while browsing History:

- Completed today: tasks currently marked complete with today's completion date
- Open: all currently unfinished tasks, including carried-over tasks
- Tracked today: the time recorded for today's date across all tasks

Task cards distinguish Today from All time. Reset today stops that task's timer and clears only its time for the current date. It keeps earlier dates and older undated time. Today's tracked total falls by the cleared amount; completion status is unchanged.

### Existing saved tasks

Older saved totals have no reliable work dates. On first load, the app preserves them as Older undated time rather than assigning them to today. Older completed tasks have an unknown completion date and appear in History, not today's completed count. Unfinished saved tasks still appear on Today. No task-title migration is needed.

A previously running task has a saved start timestamp. That known interval is counted on its start date, only up to the first midnight, while its already-saved total stays undated. Same-day running timers remain active. The upgraded records stay in the same browser's localStorage. There is no cloud backup, and clearing browser storage still removes them.

### Pomodoro timer

- Count down a 25-minute focus session
- Take a 5-minute short break, or a 15-minute long break after every fourth completed focus session
- Start, pause, and resume the current phase
- Reset to a fresh 25-minute focus session and a new four-session cycle
- Play three short beeps when a focus session or break ends
- Turn the phase-end sound on or off, and preview it with Test sound

Each phase stops when it ends. Press Start to begin the next focus session or break. The Pomodoro runs separately from task timers: it does not start, pause, or add time to a task.

### Presentation

- Responsive layout in `styles.css`
- Visible keyboard-focus styles
- On-screen Pomodoro status messages, with status changes announced to screen readers

These are implemented features, not a claim of full accessibility or cross-browser support.

## Run locally

Clone the repository and serve its files from a local folder:

```bash
git clone https://github.com/Whitetiger77/HBTrainingRepo.git
cd HBTrainingRepo
python3 -m http.server 8000
```

Open `http://localhost:8000` in a browser. Python 3 is only used here as a local server; the application itself has no framework or package-install step.

## Using the alarm

Sound defaults to On. Click Start or Test sound to enable browser audio, and keep the page open and your device and tab unmuted. Test sound previews the chime even when the phase-end sound is Off. Pause, resume, and reset do not play an alarm.

This is not a guaranteed background alarm. Browser sound settings, a sleeping device, or a suspended tab can delay or prevent the chime. The countdown uses a wall-clock deadline and catches up when the page resumes, but the alarm may play late. If audio is unavailable or blocked, the visual countdown and status messages still work.

## Known limitations

- Refreshing or closing the page resets the Pomodoro timer, its completed-session count, and its sound preference. These are not saved with tasks.
- The task list is rebuilt every second, which can remove keyboard focus from task controls.
- Saved task data is not fully validated. Malformed stored records can stop rendering, and browser-storage failures are not fully handled.
- Task timers use wall-clock time, not activity detection. They can count time while the page is closed within the same day, but stop at midnight. Changing the device clock or timezone can affect tracking; timezone changes during a running session are not specially handled.
- There is no task editing/deletion, CSV export, account system, or cloud sync in the current implementation.

## Testing and QA next steps

Source review and small local Chromium checks have covered basic task behavior and the Pomodoro countdown, pause/resume/reset, four-session break cycle, sound controls, and audio fallback. Task-title checks have covered literal HTML text, HTML payloads, previously saved tasks, and reload persistence. Daily-behavior checks in local Chromium have covered carryover, Today/History filtering, daily totals and counts, midnight while open and after reopening, same-day refresh, old-record migration, timer switching/completion, Reset today, local dates, and daylight-saving midnight calculations. Local desktop and phone-width previews have also been checked. This does not verify alarm delivery through every device's speakers.

Full manual, cross-browser, accessibility, and long-running timer testing remain to be done. Fix the known issues, then run and record tests for task creation, timer switching, completion/reset, storage recovery, keyboard use, date boundaries, and background/sleep behavior.

Publish only the test cases, results, and fixes that have actually been completed. A test plan and defect register are being reviewed separately; they are not yet part of this repository.
