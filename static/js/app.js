import Axios from "/static/lib/axios.min.js";
import html from "/static/js/htm.js";


const elements = {
  tasks: document.getElementById("tasks"),
  tags: document.getElementById("tags"),
  input: document.getElementById("input"),
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

const literals = {
  no_subtags: "<no subtags>",
};

const pseudo_tags = {
  feed: "<feed>",
  completed: "<completed>",
  all: "<all>",
}

const resizeTextarea = function() {
  this.style.height = "auto";  // Reset to calculate shrinkage
  this.style.height = this.scrollHeight + "px";
};

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
  // TODO year, month as special cases
}

// TODO that is actually testable, I need tests here

// day means 03:00, week means sunday, month means the first day
const getActivationTime = function(expr) {
  const tokens = tokenize(expr);
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
    return 0;
  }

  const stats = time_literals[period];
  if (stats === undefined) return 0;

  const now = new Date();
  const seconds = now.getTime() / 1000;
  const tzOffset = now.getTimezoneOffset() * 60;
  const totalK = stats.k * n;
  const totalOffset = stats.offset + tzOffset;

  return Math.floor((seconds - totalOffset) / totalK) * totalK + totalOffset;
};

const isCompleted = task => {
  if (task.completion_time === null) return false;
  const match = task.text.match(/@every\(([^)]+)\)/);
  if (!match) return true;
  return task.completion_time >= getActivationTime(match[1]);
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
    current_tag: pseudo_tags.feed,
  },

  // RENDERING //

  createTag: function(tag) {
    let name, title
    if (Object.values(pseudo_tags).includes(tag)) {
      name = tag;
      title = "";
    } else {
      name = tag.name;
      title = tag.subtags.length === 0
        ? literals.no_subtags
        : tag.subtags.join(" ");
    }

    return html`
      <span
        className="tag ${this.state.current_tag === name ? 'active' : ''}"
        title=${title}
        onclick=${() => this.selectTag(name)}
      >
        ${name}
      </span>
    `;
  },

  createTask: function(task) {
    const handleKeydown = async (ev) => {
      if (ev.key !== "Enter") return;
      ev.preventDefault();
      await this.changeTask(div, ev.currentTarget.value);
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

  filterTask: function(task) {
    let invert = this.state.current_tag === pseudo_tags.completed;
    if (isCompleted(task) ^ invert) return false;

    if (this.state.current_tag === pseudo_tags.feed) {
      return !this.state.tags.some(tag => doesTagMatch(tag, task.text));
    } else if (invert) {
    } else if (this.state.current_tag == pseudo_tags.all) {
    } else {
      const tag = this.state.tags.find(tag => tag.name == this.state.current_tag);
      return doesTagMatch(tag, task.text);
    }

    return true;
  },

  render: function() {
    setError("");
    elements.tags.replaceChildren(
      this.createTag(pseudo_tags.feed),
      this.createTag(pseudo_tags.completed),
      this.createTag(pseudo_tags.all),
      ...this.state.tags.map(tag => this.createTag(tag))
    );

    let renderedTasks = this.state.tasks.filter(task => this.filterTask(task));
    if (renderedTasks.length === 0) {
      elements.tasks.innerHTML = `<span class="punctuation">-- all done --</span>`
    } else {
      elements.tasks.replaceChildren(...renderedTasks.map(task => this.createTask(task)));
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
        const name = args[1]
        const subtags = args.slice(2)

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
      }

      // TODO error explaining that : means command

      return;
    }

    const response = await api.post("api/tasks", {"text": value});
    if (response.data.status === "OK") {
      this.state.tasks.push({id: response.data.id, text: value, completion_time: null});
      this.render();

      const unusable_tag = Object.values(pseudo_tags).includes(this.state.current_tag);
      if (!unusable_tag) {
        const tag = this.state.tags.find(tag => tag.name == this.state.current_tag);
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

  selectTag: function(tagname) {
    const unusable_prev = Object.values(pseudo_tags).includes(this.state.current_tag);
    const unusable_next = Object.values(pseudo_tags).includes(tagname);
    const prev = this.state.tags.find(tag => tag.name == this.state.current_tag);
    const next = this.state.tags.find(tag => tag.name == tagname);

    if (
      unusable_prev && elements.input.value === ""
      || !unusable_prev && doesTagMatch(prev, elements.input.value)
    ) {
      elements.input.value = unusable_next ? "" : (next.subtags[0] ?? next.name) + " ";
    }

    if (!is_mobile()) elements.input.focus();

    this.state.current_tag = tagname;
    this.render();
  },

  changeTask: async function(element, value) {
    // TODO reset on fail? or dimmed while pending -> normal color
    const task = element._task;
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

  toggleTask: async function(element) {
    const task = element._task
    const checkbox = element.querySelector('input[type="checkbox"]');
    const completed = checkbox.checked

    const response = await api.post(
      `api/tasks/${task.id}/` + (completed ? "complete" : "reset")
    );

    if (response.data.status != "OK") return;

    task.completion_time = completed ? Date.now() / 1000 : "reset";
    if (this.filterTask(task) == completed) {
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
  },
};

export default App;
