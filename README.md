# Workday Time Manager

A daily focus planner that runs entirely in the browser. Plan your day, track time on each task, and use a built-in Pomodoro timer for focus sprints. No frameworks, no build step, no accounts.

## Features

- Add tasks with a category (Deep work, Meetings, Admin, Learning), priority, and time estimate
- Start, pause, and reset a live timer on any task
- Mark tasks done and see a running daily summary: completed count, open count, and total time tracked
- Built-in Pomodoro session panel for working in bursts
- Automatic saving to localStorage, so your day survives a page refresh

## Run it

Clone the repo and open `index.html` in a browser. That's it. Any static file server works too:

```bash
git clone https://github.com/Whitetiger77/HBTrainingRepo.git
cd HBTrainingRepo
open index.html        # macOS
# or: python3 -m http.server 8000
```

## Tech

- Vanilla HTML, CSS, and JavaScript
- State persisted with the browser's localStorage API
- Zero dependencies

## What it shows

Dom manipulation and event handling in plain JavaScript, client-side state management, time tracking logic, and form handling, all without a framework.


## Status

Learning project, functional and in use. Ideas for later: persistent history across days, weekly summaries, and export to CSV.
