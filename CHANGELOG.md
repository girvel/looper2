# Project Roadmap / Changlog

## Queue

- [ ] Scrollable frame
- [ ] Search tasks
- [ ] Safety: async locks for submitInput & changeTask
- [ ] Research usability features for iPhone/phones
- [ ] iPhone shortcut for sharing

## v0.4 Tag ordering

- [ ] Ordered collection of tags (like #nodep -> #extra) -- EPIC tags
- [ ] publish tags (for the wishlist)
- [ ] Tag descriptions
    - [ ] Editable

## v0.3.1 UI/UX

- [x] Dim tasks that are moved to another tag, not remove them
- [x] Uncomplete tasks
- [x] Rerendering of any kind is generally messy (different scroll issues, flickering, etc.). Update manually/consider virtual DOM?
- [ ] Removing current tag breaks stuff
    - [ ] bug: :TagRemove on the current empty tag crashes
- [x] disable checkbox hover on phones
- [x] Disallow recreating special tags
- [ ] Expressions:
    - [ ] Expressions like @every(2 days)
    - [ ] Expressions like @every(Friday)
    - [ ] Cron expressions
- [ ] Prevent renames w/ unchanged tasks
- [ ] Display completed tasks on click to "all done"
    - [ ] Display a clickable span like "...228 upcoming"
- [x] Disallow space-filled tasks in backend
    - [ ] Error messages in front-end
- [x] binding:"required" for most of DTOs
- [ ] Move idioms to a separate txt file
    - [ ] How would it work with build? Maybe a go file with multiline string then?
- [x] Checked checkboxes on iphone don't look right
- [x] Splits by 1+ spaces, strip space
- [ ] Clear input button for phones
- [ ] Sort by completion time and then ID (front)
- [ ] Multiline tasks: shift+enter adds line break; needs `pre` for task labels
- [ ] Write README
- [ ] bug: complete the task, uncomplete it, look at `<completed>` -- tag's there. F5 fixes things
- [ ] Any unknown @ expression => task does not get completed ever

## v0.3.0 Auth & safety

Security milestone: restricts access with a password, provides a daily DB backup logic.

- [x] Auth
    - [x] The page
    - [x] Primitive /api/auth
    - [x] Auth middleware
    - [x] Check users against a DB
    - [x] Store token in a gitignored file
    - [x] Configure deploy to use a token
    - [x] Redirect if the JWT is invalid
    - [x] /api/auth HTTPS only
    - [x] Disallow empty username
    - [x] Auth with `[Enter]`
    - [x] Display wrong user/password pair error
    - [x] Redesign auth page
- [x] Special token for iPhone
    - [x] Think about how to issue it
- [x] Backup DB
    - [x] Test the backup script
- [x] Report errors in UI
- [x] Deploy
    - [x] Update prod DB
    - [x] Test it works
    - [x] Test the iphone shortcut works

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
- [x] Review
    - [x] Research commonly used Gin middleware
    - [x] Review error handling in endpoints
    - [x] Review
    - [x] Think about the JS refactor
- [x] Done in review
    - [x] Cache busting in Release mode (with startup time)
    - [x] Clean the root directory: remove unused files

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
- [ ] Or just mass actions
- [ ] Telegram bot to evade DPI
- [ ] Subtasks
- [ ] BIG IDEA: all of tasks is a single file
- [ ] Swagger

## Later

- [ ] Go multi-user
- [ ] Backup cleanup
- [ ] Editing tags directly (maybe doubleclick?)
    - [ ] `(+)` button
- [ ] Dim @ directives
- [ ] Disable autofocus on #input for Android
- [ ] Consider something like pseudo tag `<today>`
- [ ] RU ui
- [ ] Consider Ansible for deployment
- [ ] Don't fetch ALL the tasks (only with @ or no completion date or completed in the last month?)
- [ ] Don't deploy to ~
- [ ] selected tag should go to URL?
- [ ] Typescript?
- [ ] Gestures (swipe tasks) for phones
- [ ] Push backup to remote
- [ ] Manual task ordering
- [ ] Tasks for the future
    - [ ] Autotags like @tomorrow
