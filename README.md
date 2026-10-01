# Workday Time Manager

A browser-based learning project for planning tasks and tracking time. It uses plain HTML, CSS, and JavaScript, with local browser storage for tasks. It is a work in progress, not a finished QA portfolio showcase.

## Current features

### Tasks and time tracking

- Add a task with a plain-text title, category, priority, and time estimate
- Start and pause a task timer, with one active task at a time
- Reset a task's tracked time
- Mark tasks complete and see completed/open counts and total tracked time
- Save tasks and task-timer state in `localStorage`

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
- The task list and summary say "today", but saved tasks and tracked time are not separated by calendar day.
- The task list is rebuilt every second, which can remove keyboard focus from task controls.
- Saved task data is not fully validated. Malformed stored records can stop rendering, and browser-storage failures are not fully handled.
- An active task timer uses elapsed wall-clock time and can keep accumulating time while the page is closed. Pause it when you stop working.
- There is no task editing/deletion, history view, CSV export, account system, or cloud sync in the current implementation.

## Testing and QA next steps

Source review and small local Chromium checks have covered basic task behavior and the Pomodoro countdown, pause/resume/reset, four-session break cycle, sound controls, and audio fallback. Task-title checks have covered literal HTML text, HTML payloads, previously saved tasks, and reload persistence. Local desktop and phone-width previews have also been checked. This does not verify alarm delivery through every device's speakers.

Full manual, cross-browser, accessibility, and long-running timer testing remain to be done. Fix the known issues, then run and record tests for task creation, timer switching, completion/reset, storage recovery, keyboard use, date boundaries, and background/sleep behavior.

Publish only the test cases, results, and fixes that have actually been completed. A test plan and defect register are being reviewed separately; they are not yet part of this repository.
