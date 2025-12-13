# Project Roadmap / Changlog

## Unsorted future features

- [ ] Don't remove tasks, instead set "completed" field
- [ ] Repetitive (looping) tasks
- [ ] Tags
  - [ ] Ordered collection of tasks (like #nodep -> #extra)
  - [ ] Easy input # from iphone keyboard?
- [ ] Editing tasks
- [ ] Auth
- [ ] (Later) go multi-user
- [ ] Report errors in UI
- [ ] Telegram bot to avoid DPI??

## v0.2.0 (Auth)

JWT auth, no registering, 1 user from env variables.

## v0.1.1 (Primitive but polished)

- [ ] UI tweaks:
  - [ ] Smaller font
  - [ ] Ditch fancy checkboxes, use `[ ]` instead
  - [ ] Remove textearea borders, maybe highlight with color

## v0.1.0 (Primitive task tracking) -- DONE

The most basic thing possible: an editable list of tasks.

- [x] Task manipulation API
  - [x] Create tasks
  - [x] Get tasks
  - [x] Finish tasks
- [x] HTML rendering
  - [x] HTML hello world
  - [x] Render the list of tasks
  - [x] Finish tasks
  - [x] Add new tasks
  - [x] Dark/TUI theme
- [x] Deploy
  - [x] Docker compose
  - [x] Deploy to VPS
  - [x] Bind to iPhone
    - [x] Research the best way
  - [x] Fix the iPhone bullshit
- [x] Polish & review
  - [x] Multiple go files
  - [x] Review (include TODOs)
