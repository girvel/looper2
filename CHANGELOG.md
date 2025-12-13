# Project Roadmap / Changlog

## Unsorted future features

- [ ] Don't remove tasks, instead set "completed" field
- [ ] Repetitive (looping) tasks
- [ ] Tags: substrings to search for; the first tag substring is the tag's name, the following ones are used too.
  - [ ] Ordered collection of tags (like #nodep -> #extra) -- EPIC tags
- [ ] (Later) go multi-user
- [ ] Report errors in UI
- [ ] Editing tasks
  - [ ] Emulate vim text editing: everything is editable; periods are defined through @ and highlighted
- [ ] Telegram bot to avoid DPI??
- [ ] Ligatures (like <-, =>)
- [ ] Multiline tasks: shift+enter adds line break; needs `pre` for task labels
- [ ] Autoupdate state
  - [ ] Disable logging for autoupdate
- [ ] Auth

## v0.2.0 (Tags intro)

- [x] Table with tags
- [x] Display tags
- [x] Sort by tags in the frontend
- [ ] Make tags appear prettier: use a meaningful tag, highlight on hover, space separator
- [ ] Handle repeating subtags
- [ ] Handle tags with no subtags
- [ ] Retest
- [ ] Review

Later (move):

- [ ] UI for creating tags

## v0.1.1 (Primitive but polished) -- DONE

- [x] UI tweaks:
  - [x] Smaller font
  - [x] Ditch fancy checkboxes, use `[ ]` instead
  - [x] Remove textearea borders, maybe highlight with color
  - [x] `-- all done --`
- [x] Review JS code

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
  - [x] Review (include todos)
