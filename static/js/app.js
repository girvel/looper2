import Axios from "/static/lib/axios.min.js";
import html from "/static/js/htm.js";
import cronParser from "https://esm.sh/cron-parser@4.9.0";


const elements = {
  tasks: document.getElementById("tasks"),
  tags: document.getElementById("tags"),
  input: document.getElementById("input"),
  input_clear: document.getElementById("input_clear"),
  status: document.getElementById("status"),
};

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

// tags + pseudo tags = categories
const pseudo_tags = {
  feed: "<feed>",
  all: "<all>",
  add: "(+)",
}

const resizeTextarea = function() {
  this.style.height = "auto";  // Reset to calculate shrinkage
  this.style.height = this.scrollHeight + "px";
};

const resizeInputText = function() {
  this.size = Math.max(3, this.value.length);
}

const mod = (a, b) => ((a % b) + b) % b;

const tokenize = (str) => {
  return str.trim().split(/\s+/);
};

const is_mobile = () => window.innerWidth < 600;

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

// day means 03:00, week means sunday, month means the first day
const getEveryActivationTime = expr => {
  const now = new Date();
  const seconds = now.getTime() / 1000;

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
    return seconds;
  }

  const stats = time_literals[period];
  if (stats === undefined) return seconds;

  const tzOffset = now.getTimezoneOffset() * 60;
  const totalK = stats.k * n;
  const totalOffset = stats.offset + tzOffset;

  return Math.floor((seconds - totalOffset) / totalK) * totalK + totalOffset;
};

const getCronActivationTime = expr => {
  try {
    const interval = cronParser.parseExpression(expr);
    return Math.floor(interval.prev().getTime() / 1000);
  } catch (err) {
    console.log(`Cron expression "${expr}" is invalid`);
    return new Date().getTime() / 1000;
  }
};

const isCompleted = task => {
  if (task.completion_time === null) return false;

  const everyMatch = task.text.match(/@every\(([^)]+)\)/);
  if (everyMatch) {
    return task.completion_time >= getEveryActivationTime(everyMatch[1]);
  }

  const cronMatch = task.text.match(/@cron\(([^)]+)\)/);
  if (cronMatch) {
    return task.completion_time >= getCronActivationTime(cronMatch[1]);
  }

  return true;
}

const doesTagMatch = (tag, task_text) => {
  const task_elements = tokenize(task_text.toLowerCase());
  return task_elements.some(
    e => tag.name.toLowerCase() == e
      || tag.subtags.some(st => st.toLowerCase() == e)
  );
};


const App = {
  state: {
    tasks: [],
    tags: [],
    currentCategory: window.location.hash != ""
      ? window.location.hash
      : pseudo_tags.feed,
    displayMode: undefined,
  },

  // RENDERING //

  createCategory: function(tag) {
    const isPseudoTag = Object.values(pseudo_tags).includes(tag);
    const name = isPseudoTag ? tag : tag.name;
    let expandedName;
    if (isPseudoTag) {
      expandedName = tag;
    } else {
      expandedName = tag.name;
      if (tag.subtags.length > 0) {
        expandedName += " " + tag.subtags.join(" ");
      }
    }

    if (this.state.currentCategory != name) {
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
        disabled=${isPseudoTag && tag !== pseudo_tags.add}
        oninput=${resizeInputText}
      />
    `;

    if (!isPseudoTag) {
      input.onchange = async ev => this.changeTag(tag.name, ev.currentTarget.value);
    }

    if (tag === pseudo_tags.add) {
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

  createTask: function(task) {
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

  doesCategoryMatch: function(tag, task_text) {
    if (tag === pseudo_tags.feed) {
      return !this.state.tags.some(tag => doesTagMatch(tag, task_text));
    } else if (this.state.currentCategory === pseudo_tags.all) {
      return true;
    } else if (this.state.currentCategory === pseudo_tags.add) {
      return false;
    } else {
      const tag = this.state.tags.find(tag => tag.name === this.state.currentCategory);
      return doesTagMatch(tag, task_text);
    }
  },

  filterTask: function(task) {
    return !isCompleted(task) && this.doesCategoryMatch(this.state.currentCategory, task.text);
  },

  render: function(displayMode) {
    this.state.displayMode = displayMode;
    setError("");
    elements.tags.replaceChildren(
      this.createCategory(pseudo_tags.feed),
      this.createCategory(pseudo_tags.all),
      ...this.state.tags.map(tag => this.createCategory(tag)),
      this.createCategory(pseudo_tags.add),
    );

    let renderedTasks = this.state.tasks;

    if (displayMode === undefined) {
      renderedTasks = renderedTasks.filter(t => this.filterTask(t));
    } else if (displayMode === "completed") {
      renderedTasks = renderedTasks
        .filter(t => this.doesCategoryMatch(this.state.currentCategory, t.text));
    } else {
      renderedTasks = renderedTasks
        .filter(t => this.doesCategoryMatch(this.state.currentCategory, t.text)
          && t.text.match(/\@/));
    }

    renderedTasks = renderedTasks
      .sort((a, b) => {
        const a_time = a.completion_time ?? Infinity;
        const b_time = b.completion_time ?? Infinity;
        return isCompleted(a) < isCompleted(b) || a_time > b_time || a.id > b.id;
      });

    if (renderedTasks.length === 0) {
      if (this.state.currentCategory === pseudo_tags.add) {
        elements.tasks.innerHTML = ""
      } else {
        elements.tasks.replaceChildren(html`
          <span
            class="punctuation button"
            onclick=${() => this.render(true)}
          >-- all done --</span>
        `);
      }
    } else {
      let tasks = renderedTasks.map(task => this.createTask(task));
      if (displayMode === undefined) {
        let completedCount = this.state.tasks
          .filter(t => isCompleted(t) && this.doesCategoryMatch(this.state.currentCategory, t.text))
          .length;
        let scheduledCount = this.state.tasks
          .filter(t => this.doesCategoryMatch(this.state.currentCategory, t.text)
            && t.text.match(/\@/))
          .length;

        if (completedCount > 0 || scheduledCount > 0) {
          tasks.splice(0, 0, html`
            <div>
              <span
                class="punctuation button"
                onclick=${() => this.render("completed")}
              >...${completedCount} completed</span>
              <span class="punctuation">, </span>
              <span
                class="punctuation button"
                onclick=${() => this.render("scheduled")}
              >${scheduledCount} scheduled</span>
            </div>
          `)
        }
      }
      elements.tasks.replaceChildren(...tasks);
      elements.tasks.scrollTop = elements.tasks.scrollHeight;
    }
  },

  // INTERACTIONS //

  refresh: async function() {
    const active = document.activeElement;
    const isEditingInRender = active && elements.tasks.contains(active);

    if (isEditingInRender) {
      console.log("Skipping rerender, user is editing");
    } else {
      const newTasks = await api.get("/api/tasks");
      const newTags = await api.get("/api/tags");
      this.state.tasks = newTasks.data;
      this.state.tags = newTags.data;

      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      this.render();
      window.scrollTo(scrollX, scrollY);
    }
  },

  submitInput: async function() {
    const value = elements.input.value.trim()
    if (value === "") return;

    if (value.startsWith(":")) {
      const args = tokenize(value);

      if (args[0] == ":Tag") {
        const name = args[1];
        const subtags = args.slice(2);

        if (Object.values(pseudo_tags).includes(name)) {
          setError("Don't.");
          return;
        }

        const response = await api.post("api/tags", {name: name, subtags: subtags});

        if (response.data.status === "OK") {
          this.state.tags = (await api.get("/api/tags")).data;
          this.render();
          elements.input.value = "";
        }
      } else if (args[0] == ":TagRemove") {
        const response = await api.post("api/tags/remove", {name: args[1]});

        if (response.data.status === "OK") {
          this.state.tags = (await api.get("/api/tags")).data;
          this.render();
          elements.input.value = "";
        }
      } else {
        setError(`Unknown command "${args[0]}"; any input starting with ":" is a command, btw.`);
      }

      return;
    }

    const response = await api.post("api/tasks", {"text": value});
    if (response.data.status === "OK") {
      this.state.tasks.push({id: response.data.id, text: value, completion_time: null});
      this.render();

      const unusable_tag = Object.values(pseudo_tags).includes(this.state.currentCategory);
      if (!unusable_tag) {
        const tag = this.state.tags.find(tag => tag.name == this.state.currentCategory);
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

  selectCategory: function(tagname) {
    if (window.location.hash != tagname && tagname[0] == "#") {
      history.pushState(null, null, tagname);
    } else {
      history.pushState(null, null, "/");
    }

    const unusable_prev = Object.values(pseudo_tags).includes(this.state.currentCategory);
    const unusable_next = Object.values(pseudo_tags).includes(tagname);
    const prev = this.state.tags.find(tag => tag.name == this.state.currentCategory);
    const next = this.state.tags.find(tag => tag.name == tagname);

    if (
      unusable_prev && elements.input.value === ""
      || !unusable_prev && doesTagMatch(prev, elements.input.value)
    ) {
      elements.input.value = unusable_next ? "" : (next.subtags[0] ?? next.name) + " ";
    }

    if (!is_mobile()) elements.input.focus();

    this.state.currentCategory = tagname;
    this.render();
  },

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

  changeTag: async function(tagname, expr) {
    const args = tokenize(expr);
    if (!args.every(a => !Object.values(pseudo_tags).includes(a))) {
      setError("Don't.");
      return;
    }

    const new_name = args[0];
    const subtags = args.slice(1);
    if (new_name.length === 0) {
      await api.post("api/tags/remove", {name: tagname});
      this.state.currentCategory = pseudo_tags.feed;
    } else if (new_name != tagname) {
      await api.post("api/tags/remove", {name: tagname});
      await api.post("api/tags", {name: new_name, subtags: subtags});
      this.state.currentCategory = new_name;
    } else {
      await api.post("api/tags", {name: new_name, subtags: subtags});
    }

    this.state.tags = (await api.get("/api/tags")).data;
    this.render();
  },

  addTag: async function(expr) {
    const args = tokenize(expr);
    if (!args.every(a => !Object.values(pseudo_tags).includes(a))) {
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
    this.state.currentCategory = name;

    this.state.tags = (await api.get("/api/tags")).data;
    this.render();
  },

  toggleTask: async function(element) {
    const task = element._task
    const checkbox = element.querySelector('input[type="checkbox"]');
    const completed = checkbox.checked

    const response = await api.post(
      `api/tasks/${task.id}/` + (completed ? "complete" : "reset")
    );

    if (response.data.status != "OK") return;

    task.completion_time = completed ? Date.now() / 1000 : "reset";
    if (this.state.displayMode !== undefined || !completed) {
      element.classList.remove("punctuation");
    } else {
      element.classList.add("punctuation");
    }
  },

  // PUBLIC //

  bind: async function() {
    // allows HTML to fully load on slow internet speed
    this.refresh();

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

export default App;
