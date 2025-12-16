# Project Roadmap / Changlog

## Queue

- [ ] Ordered collection of tags (like #nodep -> #extra) -- EPIC tags
- [ ] Multiline tasks: shift+enter adds line break; needs `pre` for task labels
- [ ] Tag ordering
- [ ] Tag descriptions
    - [ ] Editable
- [ ] Prevent renames w/ unchanged tasks
- [ ] Reordering tasks
- [ ] Move idioms to a separate txt file
    - [ ] How would it work with build? Maybe a go file with multiline string then?
- [ ] Uncompleting tasks?
- [ ] Removing current tag breaks stuff
- [ ] Clean the root directory: remove unused files
- [ ] Scrollable frame
- [ ] Clear input button for phones
- [ ] Splits by 1+ spaces, strip space
- [ ] Sort by completion time and then ID (front)
- [ ] Uncomplete tasks
- [ ] Search
- [ ] Disallow recreating special tags
- [ ] Checked checkboxes on iphone don't look right

## Auth & safety

Hopefully v0.3.0

- [ ] Auth
- [ ] Special token for iPhone
- [ ] Backup DB
- [ ] Report errors in UI
- [ ] Don't fetch ALL the tasks (only with @every/no completion date)
- [ ] Typescript?

## v0.2.1 (Main features polished)

- [x] Code
    - [x] When finished editing a task, autosort it
    - [x] Tags/subtags consider spacing
    - [x] bug: editing the task + adding another one => hides edits
    - [x] Move between task entries with arrows
    - [x] `<completed>` pseudo-tag
    - [x] When switching to the tag and textarea is empty, or when submitting the task: set textarea to `<first subtag or tag><space>`
    - [x] `<all>` pseudo-tag
    - [x] Autoupdate state
    - [x] GIN_MODE=release, attach all required middleware by hand
- [ ] Review
    - [ ] Research commonly used Gin middleware
    - [ ] Review error handling in endpoints
    - [x] Review
    - [ ] Think about the JS refactor

## v0.2.0 (Main features) -- DONE

Introduces tags, periods, allows editing tasks

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

## Never

- [ ] Emulate vim text editing: everything is editable; periods are defined through @ and highlighted
- [ ] Telegram bot to evade DPI
- [ ] Subtasks

## Later

- [ ] Go multi-user
- [ ] Editing tags directly (maybe doubleclick?)
    - [ ] `(+)` button
- [ ] Dim @ directives
