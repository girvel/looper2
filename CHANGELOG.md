# Project Roadmap / Changlog

## Unsorted future features

- [ ] Ordered collection of tags (like #nodep -> #extra) -- EPIC tags
- [ ] (Later) go multi-user
- [ ] Report errors in UI
- [ ] ?? Emulate vim text editing: everything is editable; periods are defined through @ and highlighted
- [ ] Telegram bot to avoid DPI??
- [ ] Multiline tasks: shift+enter adds line break; needs `pre` for task labels
- [ ] Autoupdate state
    - [ ] Disable logging for autoupdate
- [ ] Auth
- [ ] Sort tags
- [ ] Editing tags directly (maybe doubleclick?)
    - [ ] `(+)` button
- [ ] Autoattaching tags (when adding task from inside the tag)
- [ ] Tag descriptions
    - [ ] Editable
- [ ] `<completed>` pseudo-tag
- [ ] Auto-sort tasks by tag on editing (run render?)
- [ ] Move between task entries with arrows
- [ ] Dim @ directives

## v0.2.0 (Tags intro)

- [x] Table with tags
- [x] Display tags
- [x] Sort by tags in the frontend
- [x] Make tags appear prettier: use a meaningful tag, highlight on hover, space separator
- [x] Handle repeating subtags
- [x] Handle tags with no subtags
- [x] Display subtags in a hover hint
- [x] Edit tags with `:Tag <name> [subtags...]`
- [x] Remove tags with `:TagRemove <name>`
- [x] Feed should contain only unsorted tags
- [x] Ligatures (like <-, =>)
- [x] Editing tasks
- [x] Don't remove tasks, instead set "completed" field
- [x] Repetitive (looping) tasks
- [ ] Retest
- [ ] Review; is JS a bit too complicated?


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
