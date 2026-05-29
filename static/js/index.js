import Axios from "/static/lib/axios.min.js";
import html from "/static/js/htm.js";
import cronParser from "https://esm.sh/cron-parser@4.9.0";


//--------------------------------------------------------------------------------------------------
// [SECTION] Types
//--------------------------------------------------------------------------------------------------

/**
 * @typedef {Object} Task
 * @property {number|null} completion_time
 * @property {string} text
 * @property {number} id
 */

/**
 * @typedef {Object} Tag
 * @property {string} name
 * @property {string[]} subtags
 */

/** @enum {string} */
const PseudoTag = {
  feed: "<feed>",
  all: "<all>",
  add: "(+)",
}

/** @typedef {Tag|PseudoTag} Category */

/** @typedef {"scheduled"|"completed"=} DisplayMode */

/**
 * @typedef {HTMLElement & {_task: Task}} TaskElement
 */

//--------------------------------------------------------------------------------------------------
// [SECTION] DOM/Backend access
//--------------------------------------------------------------------------------------------------

const elements = {
  tasks: /** @type {HTMLDivElement} */ (document.getElementById("tasks")),
  tags: /** @type {HTMLDivElement} */ (document.getElementById("tags")),
  input: /** @type {HTMLInputElement} */ (document.getElementById("input")),
  input_clear: /** @type {HTMLButtonElement} */ (document.getElementById("input_clear")),
  status: /** @type {!HTMLSpanElement} */ (document.getElementById("status")),
};

/**
 * @param {string} msg
 */
const setError = msg => {
  elements.status.innerText = msg;
};

const api = Axios.create();
api.interceptors.response.use(
  response => response,
  error => {
    if (!error.response) {
      setError("Connection issues");
    } else {
      const status = error.response.status;
      if (status >= 500) {
        setError("Server error");
      } else if (status >= 400) {
        setError("Unknown error");
      }
    }
    return Promise.reject(error);
  },
);

/**
 * @this {HTMLTextAreaElement}
 */
const resizeTextarea = function() {
  this.style.height = "auto";  // Reset to calculate shrinkage
  this.style.height = this.scrollHeight + "px";
};

/**
 * @this {HTMLInputElement}
 */
const resizeInputText = function() {
  this.size = Math.max(3, this.value.length);
}

const isMobile = () => window.innerWidth < 600;

//--------------------------------------------------------------------------------------------------
// [SECTION] Auxiliary
//--------------------------------------------------------------------------------------------------

/**
 * @param {number} a
 * @param {number} b
 * @return {number}
 */
const mod = (a, b) => ((a % b) + b) % b;

/**
 * @param {string} str
 * @return {string[]}
 */
const tokenize = (str) => {
  return str.trim().split(/\s+/);
};

//--------------------------------------------------------------------------------------------------
// [SECTION] Expression & tag logic
//--------------------------------------------------------------------------------------------------

const time_literals = {
  second: {k: 1, offset: 0},
  minute: {k: 60, offset: 0},
  hour: {k: 3600, offset: 0},
  day: {k: 24 * 3600, offset: 3 * 3600},
  week: {k: 7 * 24 * 3600, offset: 3 * 3600 + 3 * 24 * 3600},
  monday:    {k: 7 * 24 * 3600, offset: 3 * 3600 + 4 * 24 * 3600},
  tuesday:   {k: 7 * 24 * 3600, offset: 3 * 3600 + 5 * 24 * 3600},
  wednesday: {k: 7 * 24 * 3600, offset: 3 * 3600 + 6 * 24 * 3600},
  thursday:  {k: 7 * 24 * 3600, offset: 3 * 3600 + 0 * 24 * 3600},
  friday:    {k: 7 * 24 * 3600, offset: 3 * 3600 + 1 * 24 * 3600},
  saturday:  {k: 7 * 24 * 3600, offset: 3 * 3600 + 2 * 24 * 3600},
  sunday:    {k: 7 * 24 * 3600, offset: 3 * 3600 + 3 * 24 * 3600},
  // TODO year, month as special cases
}

time_literals.s = time_literals.second
time_literals.m = time_literals.minute
time_literals.h = time_literals.hour
time_literals.d = time_literals.day
time_literals.w = time_literals.week
time_literals.mon = time_literals.monday
time_literals.tue = time_literals.tuesday
time_literals.wed = time_literals.wednesday
time_literals.thu = time_literals.thursday
time_literals.fri = time_literals.friday
time_literals.sat = time_literals.saturday
time_literals.sun = time_literals.sunday

// TODO that is actually testable, I need tests here

/**
 * day means 03:00, week means sunday, month means the first day
 * @param {string} expr
 * @param {number} completionTime
 * @return {boolean}
 */
const isEveryCompleted = (expr, completionTime) => {
  const tokens = tokenize(expr.toLowerCase());
  let n, period;
  if (tokens.length == 1) {
    n = 1;
    period = tokens[0];
  } else if (tokens.length == 2) {
    n = Number(tokens[0]);
    period = tokens[1];
    if (period.endsWith("s")) {
      period = period.substring(0, period.length - 1);
    }
  } else {
    return false;
  }

  const stats = time_literals[period];
  if (stats === undefined) return false;

  const now = new Date();
  const seconds = now.getTime() / 1000;
  const tzOffset = now.getTimezoneOffset() * 60;
  const totalK = stats.k * n;
  const totalOffset = stats.offset + tzOffset;

  return Math.floor((seconds - totalOffset) / totalK) * totalK + totalOffset <= completionTime;
};

/**
 * @param {string} expr
 * @param {number} completionTime
 * @return {boolean}
 */
const isCronCompleted = (expr, completionTime) => {
  try {
    let interval = cronParser.parseExpression(expr, {currentDate: new Date(completionTime * 1000)});
    return Date.now() / 1000 <= Math.floor(interval.next().getTime() / 1000);
  } catch (err) {
    console.error(err);
    console.log(`Cron expression "${expr}" is invalid`);
    return false;
  }
};

/**
 * @param {Task} task
 * @return {boolean}
 */
const isCompleted = task => {
  if (task.completion_time === null) return false;

  const everyMatch = task.text.match(/@every\(([^)]+)\)/);
  if (everyMatch) {
    return isEveryCompleted(everyMatch[1], task.completion_time);
  }

  const cronMatch = task.text.match(/@cron\(([^)]+)\)/);
  if (cronMatch) {
    return isCronCompleted(cronMatch[1], task.completion_time);
  }

  return true;
}

/**
 * @param {Tag} tag
 * @param {string} taskText
 * @return {boolean}
 */
const doesTagMatch = (tag, taskText) => {
  const task_elements = tokenize(taskText.toLowerCase());
  return task_elements.some(
    e => tag.name.toLowerCase() == e
      || tag.subtags.some(st => st.toLowerCase() == e)
  );
};

//--------------------------------------------------------------------------------------------------
// [SECTION] The App
//--------------------------------------------------------------------------------------------------

const App = {
  /** @type {Task[]} */
  tasks: [],
  /** @type {Tag[]} */
  tags: [],
  /** @type {string} */
  currentCategory: window.location.hash != ""
    ? window.location.hash
    : PseudoTag.feed,
  /** @type {DisplayMode} */
  displayMode: undefined,

  // RENDERING //

  /**
   * @param {Category} category
   * @return {HTMLElement}
   */
  constructCategory: function(category) {
    const isPseudoTag = Object.values(PseudoTag).includes(category);
    let name, expandedName;
    if (isPseudoTag) {
      name = category;
      expandedName = category;
    } else {
      name = category.name;
      expandedName = category.name;
      if (category.subtags.length > 0) {
        expandedName += " " + category.subtags.join(" ");
      }
    }

    if (this.currentCategory != name) {
      return html`
        <span
          className="tag"
          title=${expandedName}
          onclick=${() => this.selectCategory(name)}
        >
          ${name}
        </span>
      `;
    }

    let input = html`
      <input
        type="text"
        class="active_tag"
        rows="1"
        disabled=${isPseudoTag && category !== PseudoTag.add}
        oninput=${resizeInputText}
      />
    `;

    if (!isPseudoTag) {
      input.onchange = async ev => this.changeTag(category.name, ev.currentTarget.value);
    }

    if (category === PseudoTag.add) {
      input.value = "";
      input.placeholder = "#tag subtag1 subtag2";
      input.size = input.placeholder.length;
      setTimeout(() => input.focus(), 0);
      input.onchange = async ev => this.addTag(ev.currentTarget.value);
    } else {
      input.value = expandedName;
      input.size = expandedName.length;
    }

    return input;
  },

  /**
   * @param {Task} task
   * @return {HTMLElement}
   */
  constructTask: function(task) {
    const handleKeydown = async (ev) => {
      if (ev.key !== "Enter") return;
      ev.preventDefault();
      try {
        await this.changeTask(div, ev.currentTarget.value);
      } catch (error) {
        if (error.status === 400) {
          setError("Invalid task");
        }
      }
    };

    const textarea = html`
      <textarea
        rows="1"
        onchange=${async ev => this.changeTask(div, ev.currentTarget.value)}
        onkeydown=${handleKeydown}
        oninput=${resizeTextarea}
      >
        ${task.text}
      </textarea>
    `;
    setTimeout(() => resizeTextarea.call(textarea), 0);

    const is_completed = isCompleted(task);
    const div = html`
      <div className="task" _task=${task}>
        <input
          type="checkbox"
          checked=${is_completed}
          onchange=${async ev => this.toggleTask(ev.currentTarget.closest(".task"))}
        />
        ${textarea}
      </div>
    `;

    return div;
  },

  /**
   * @param {Category} category
   * @param {string} taskText
   * @return {boolean}
   */
  doesCategoryMatch: function(category, taskText) {
    if (category === PseudoTag.feed) {
      return !this.tags.some(tag => doesTagMatch(tag, taskText));
    } else if (this.currentCategory === PseudoTag.all) {
      return true;
    } else if (this.currentCategory === PseudoTag.add) {
      return false;
    } else {
      const tag = this.tags.find(tag => tag.name === this.currentCategory);
      return doesTagMatch(tag, taskText);
    }
  },

  /**
   * @param {Task} task
   * @return {boolean}
   */
  filterTask: function(task) {
    return !isCompleted(task) && this.doesCategoryMatch(this.currentCategory, task.text);
  },

  /**
   * @param {DisplayMode=} displayMode
   */
  reconstruct: function(displayMode) {
    this.displayMode = displayMode;
    setError("");
    elements.tags.replaceChildren(
      this.constructCategory(PseudoTag.feed),
      this.constructCategory(PseudoTag.all),
      ...this.tags.map(tag => this.constructCategory(tag)),
      this.constructCategory(PseudoTag.add),
    );

    let renderedTasks = this.tasks;

    if (displayMode === undefined) {
      renderedTasks = renderedTasks.filter(t => this.filterTask(t));
    } else if (displayMode === "completed") {
      renderedTasks = renderedTasks
        .filter(t => this.doesCategoryMatch(this.currentCategory, t.text));
    } else {
      renderedTasks = renderedTasks
        .filter(t => this.doesCategoryMatch(this.currentCategory, t.text)
          && t.text.match(/\@/));
    }

    let areCompleted = new Map();
    for (let task of renderedTasks) {
      areCompleted.set(task, isCompleted(task));
    }

    renderedTasks = renderedTasks
      .sort((a, b) => {
        const aCompleted = areCompleted.get(a);
        if (aCompleted !== areCompleted.get(b)) {
          return aCompleted ? -1 : 1;
        }

        const aTime = a.completion_time ?? Infinity;
        const bTime = b.completion_time ?? Infinity;
        if (aTime !== bTime) {
          return aTime - bTime;
        }

        return a.id - b.id;
      });

    if (renderedTasks.length === 0) {
      if (this.currentCategory === PseudoTag.add) {
        elements.tasks.innerHTML = ""
      } else {
        elements.tasks.replaceChildren(html`
          <span
            class="punctuation button"
            onclick=${() => this.reconstruct("completed")}
          >-- all done --</span>
        `);
      }
    } else {
      let tasks = renderedTasks.map(task => this.constructTask(task));
      if (displayMode === undefined) {
        let completedCount = this.tasks
          .filter(t => isCompleted(t) && this.doesCategoryMatch(this.currentCategory, t.text))
          .length;
        let scheduledCount = this.tasks
          .filter(t => this.doesCategoryMatch(this.currentCategory, t.text)
            && t.text.match(/\@/))
          .length;

        if (completedCount > 0 || scheduledCount > 0) {
          tasks.splice(0, 0, html`
            <div>
              <span
                class="punctuation button"
                onclick=${() => this.reconstruct("completed")}
              >...${completedCount} completed</span>
              <span class="punctuation">, </span>
              <span
                class="punctuation button"
                onclick=${() => this.reconstruct("scheduled")}
              >${scheduledCount} scheduled</span>
            </div>
          `)
        }
      }
      elements.tasks.replaceChildren(...tasks);
      setTimeout(() => elements.tasks.scrollTop = elements.tasks.scrollHeight, 0);
    }
  },

  // INTERACTIONS //

  submitInput: async function() {
    const value = elements.input.value.trim()
    if (value === "") return;

    if (value.startsWith(":")) {  // NEXT remove commands
      const args = tokenize(value);

      if (args[0] == ":Tag") {
        const name = args[1];
        const subtags = args.slice(2);

        if (Object.values(PseudoTag).includes(name)) {
          setError("Don't.");
          return;
        }

        const response = await api.post("api/tags", {name: name, subtags: subtags});

        if (response.data.status === "OK") {
          this.tags = (await api.get("/api/tags")).data;
          this.reconstruct();
          elements.input.value = "";
        }
      } else if (args[0] == ":TagRemove") {
        const response = await api.post("api/tags/remove", {name: args[1]});

        if (response.data.status === "OK") {
          this.tags = (await api.get("/api/tags")).data;
          this.reconstruct();
          elements.input.value = "";
        }
      } else {
        setError(`Unknown command "${args[0]}"; any input starting with ":" is a command, btw.`);
      }

      return;
    }

    const response = await api.post("api/tasks", {"text": value});
    if (response.data.status === "OK") {
      this.tasks.push({id: response.data.id, text: value, completion_time: null});
      this.reconstruct();

      const unusable_tag = Object.values(PseudoTag).includes(this.currentCategory);
      if (!unusable_tag) {
        const tag = this.tags.find(tag => tag.name == this.currentCategory);
        if (doesTagMatch(tag, value)) {
          elements.input.value = (tag.subtags[0] ?? tag.name) + " ";
        } else {
          elements.input.value = "";
        }
      } else {
        elements.input.value = "";
      }
    }
  },

  /**
   * @param {string} tagname
   */
  selectCategory: function(tagname) {
    if (window.location.hash != tagname && tagname[0] == "#") {
      history.pushState(null, null, tagname);
    } else {
      history.pushState(null, null, "/");
    }

    const unusable_prev = Object.values(PseudoTag).includes(this.currentCategory);
    const unusable_next = Object.values(PseudoTag).includes(tagname);
    const prev = this.tags.find(tag => tag.name == this.currentCategory);
    const next = this.tags.find(tag => tag.name == tagname);

    if (
      unusable_prev && elements.input.value === ""
      || !unusable_prev && doesTagMatch(prev, elements.input.value)
    ) {
      elements.input.value = unusable_next ? "" : (next.subtags[0] ?? next.name) + " ";
    }

    if (!isMobile()) elements.input.focus();

    this.currentCategory = tagname;
    this.reconstruct();
  },

  /**
   * @param {TaskElement} element
   * @param {string} value
   */
  changeTask: async function(element, value) {
    // TODO reset on fail? or dimmed while pending -> normal color
    const task = element._task;
    if (task.text == value) return;
    const response = await api.post(`api/tasks/${task.id}/rename`, {text: value});
    if (response.data.status == "OK") {
      task.text = value;
      if (this.filterTask(task)) {
        element.classList.remove("punctuation");
      } else {
        element.classList.add("punctuation");
      }
    }
  },

  /**
   * @param {string} tagname
   * @param {string} expr
   */
  changeTag: async function(tagname, expr) {
    const args = tokenize(expr);
    if (args.some(a => Object.values(PseudoTag).includes(a))) {
      setError("Don't.");
      return;
    }

    const new_name = args[0];
    const subtags = args.slice(1);
    if (new_name.length === 0) {
      await api.post("api/tags/remove", {name: tagname});
      this.currentCategory = PseudoTag.feed;
    } else if (new_name != tagname) {
      await api.post("api/tags/remove", {name: tagname});
      await api.post("api/tags", {name: new_name, subtags: subtags});
      this.currentCategory = new_name;
    } else {
      await api.post("api/tags", {name: new_name, subtags: subtags});
    }

    this.tags = (await api.get("/api/tags")).data;
    this.reconstruct();
  },

  /**
   * @param {string} expr
   */
  addTag: async function(expr) {
    const args = tokenize(expr);
    if (args.some(a => Object.values(PseudoTag).includes(a))) {
      setError("Don't.");
      return;
    }

    const name = args[0];
    if (name.length === 0) {
      setError("Tag name should not be empty");
      return;
    }

    const subtags = args.slice(1);
    await api.post("api/tags", {name: name, subtags: subtags});
    this.currentCategory = name;

    this.tags = (await api.get("/api/tags")).data;
    this.reconstruct();
  },

  /**
   * @param {TaskElement} element
   */
  toggleTask: async function(element) {
    const task = element._task
    const checkbox = element.querySelector('input[type="checkbox"]');
    const completed = checkbox.checked

    const response = await api.post(
      `api/tasks/${task.id}/` + (completed ? "complete" : "reset")
    );

    if (response.data.status != "OK") return;

    task.completion_time = completed ? Date.now() / 1000 : null;
    if (this.displayMode !== undefined || !completed) {
      element.classList.remove("punctuation");
    } else {
      element.classList.add("punctuation");
    }
  },

  // PUBLIC //

  bind: async function() {
    this.tasks = (await api.get("/api/tasks")).data;
    this.tags = (await api.get("/api/tags")).data;
    this.reconstruct();

    elements.tasks.addEventListener("keydown", ev => {
      if (ev.target.tagName !== "TEXTAREA") return;
      const textareas = Array.from(elements.tasks.querySelectorAll("textarea"));
      const textarea = ev.target;
      const index = textareas.indexOf(textarea);

      if (ev.key == "Tab") {
        ev.preventDefault();
        elements.input.focus();
        elements.input.select();
        return;
      }

      let offset;
      if (ev.key == "ArrowDown") {
        offset = 1;
      } else if (ev.key == "ArrowUp") {
        offset = -1;
      } else {
        return;
      }

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const next = textareas[mod(index + offset, textareas.length)];

      ev.preventDefault();
      next.focus();
      next.setSelectionRange(start, end);
    });

    elements.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.submitInput();
      }
    });

    elements.input.addEventListener("input", resizeTextarea);
    resizeTextarea.call(elements.input);

    elements.input_clear.addEventListener("click", () => {
      elements.input.value = "";
    });

    window.addEventListener("hashchange", () => {
      this.selectCategory(window.location.hash);
    });
  },
};

//--------------------------------------------------------------------------------------------------
// [SECTION] Attach
//--------------------------------------------------------------------------------------------------

App.bind();
