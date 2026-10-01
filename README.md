# Workday Time Manager

A browser-based learning project for planning tasks and tracking time. The current implementation uses plain HTML and JavaScript with local browser storage. It is a work in progress, not a finished QA portfolio showcase.

## Implemented in the current code

- Add a task with a title, category, priority, and time estimate
- Start and pause a task timer, with one active task at a time
- Reset a task\x27s tracked time
- Mark tasks complete and see completed/open counts and total tracked time
- Save tasks and timer state in localStorage

These features were checked through source review and a small local Chromium test harness. Full manual, cross-browser, accessibility, and long-running timer testing remain to be done.

## Run locally

Clone the repository and serve its files from a local folder:

```bash
git clone https://github.com/Whitetiger77/HBTrainingRepo.git
cd HBTrainingRepo
python3 -m http.server 8000
```

Open `http://localhost:8000` in a browser. Python 3 is only used here as a local server; the application itself has no framework or package-install step.

## Known limitations

- The Pomodoro panel is a placeholder. Its Start/Reset controls do not implement a countdown.
- The summary says "today", but saved tasks and tracked time are not separated by calendar day.
- Task titles are inserted as HTML rather than plain text. Do not paste HTML or untrusted task titles until this is fixed.
- The task list is rebuilt every second, which can remove keyboard focus from task controls.
- Saved task data is not fully validated. Malformed stored records can stop rendering.
- There is no task editing/deletion, history view, CSV export, account system, or cloud sync in the current implementation.

## QA next steps

Fix the known issues, then run and record tests for task creation, timer switching, completion/reset, storage recovery, keyboard use, and date boundaries. Publish only the test cases, results, and fixes that have actually been completed. A test plan and defect register are being reviewed separately; they are not yet part of this repository.
