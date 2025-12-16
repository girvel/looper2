import Axios from "/static/lib/axios.min.js";
import html from "/static/js/htm.js";


const elements = {
  tasks: document.getElementById("tasks"),
  tags: document.getElementById("tags"),
  input: document.getElementById("input"),
};

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

const getActivationTime = function(expr) {
  let date = new Date();
  if (expr === "second") {
    date.setMilliseconds(0);
  } else if (expr === "day") {
    date.setHours(3, 0, 0, 0);
  } else if (expr === "week") {
    date.setHours(3, 0, 0, 0);
    date.setDate(date.getDate() - date.getDay());
  } else if (expr === "month") {
    date.setHours(3, 0, 0, 0);
    date.setDate(1);
  } else {
    return 0;
  }

  return date.getTime() / 1000;
};

const isCompleted = task => {
  const match = task.text.match(/@every\(([^)]+)\)/);
  if (!match) {
    return task.completion_time !== null;
  }
  return task.completion_time >= getActivationTime(match[1]);
}

const doesTagMatch = (tag, task_text) => {
  const task_elements = task_text.toLowerCase().split(" ");
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
    const handleKeydown = async (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      await this.changeTask(task, ev.currentTarget.value);
    };

    const textarea = html`
      <textarea
        rows="1"
        onchange=${async ev => this.changeTask(task, ev.currentTarget.value)}
        onkeydown=${handleKeydown}
        oninput=${resizeTextarea}
      >
        ${task.text}
      </textarea>
    `;
    setTimeout(() => resizeTextarea.call(textarea), 0);

    const is_completed = isCompleted(task);
    const div = html`
      <div className="task">
        <input
          type="checkbox"
          checked=${is_completed}
          disabled=${is_completed}
          onchange=${async () => this.completeTask(task)}
        />
        ${textarea}
      </div>
    `;

    return [div, textarea];
  },

  filterTasks: function() {
    let invert = this.state.current_tag === pseudo_tags.completed;
    let result = this.state.tasks.filter(task => !isCompleted(task) ^ invert);

    if (this.state.current_tag === pseudo_tags.feed) {
      result = result.filter(task => !this.state.tags.some(tag => doesTagMatch(tag, task.text)));
    } else if (invert) {
    } else if (this.state.current_tag == pseudo_tags.all) {
    } else {
      const tag = this.state.tags.find(tag => tag.name == this.state.current_tag);
      result = result.filter(task => doesTagMatch(tag, task.text));
    }

    return result;
  },

  render: function() {
    elements.tags.replaceChildren();
    elements.tags.appendChild(this.createTag(pseudo_tags.feed));
    elements.tags.appendChild(this.createTag(pseudo_tags.completed));
    elements.tags.appendChild(this.createTag(pseudo_tags.all));
    for (const tag of this.state.tags) {
      elements.tags.appendChild(this.createTag(tag));
    }

    let renderedTasks = this.filterTasks();
    if (renderedTasks.length === 0) {
      elements.tasks.innerHTML = `<span class="punctuation">-- all done --<span>`
      return;
    }

    elements.tasks.replaceChildren();
    let textareas = [];
    for (const task of renderedTasks) {
      const [div, textarea] = this.createTask(task);
      elements.tasks.appendChild(div);
      textareas.push(textarea);
    }

    for (const [i, textarea] of textareas.entries()) {
      textarea.addEventListener("keydown", ev => {
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
        const next = textareas[mod(i + offset, textareas.length)];

        ev.preventDefault();
        next.focus();
        next.setSelectionRange(start, end);
      });
    }
  },

  // INTERACTIONS //

  refresh: async function() {
    const newTasks = await Axios.get("/api/tasks");
    const newTags = await Axios.get("/api/tags");
    this.state.tasks = newTasks.data;
    this.state.tags = newTags.data;

    const active = document.activeElement;
    const isEditingInRender = active && elements.tasks.contains(active);

    if (isEditingInRender) {
      console.log("Skipping rerender, user is editing");
    } else {
      this.render();
    }
  },

  submitInput: async function() {
    const value = elements.input.value
    if (value === "") return;

    if (value.startsWith(":")) {
      const args = value.split(" ");

      if (args[0] == ":Tag") {
        const response = await Axios.post("api/tags", {"name": args[1], "subtags": args.slice(2)});

        if (response.data.status === "OK") {
          this.state.tags = (await Axios.get("/api/tags")).data;
          this.render();
          elements.input.value = "";
        }
      } else if (args[0] == ":TagRemove") {
        const response = await Axios.post("api/tags/remove", {"name": args[1]});

        if (response.data.status === "OK") {
          this.state.tags = (await Axios.get("/api/tags")).data;
          this.render();
          elements.input.value = "";
        }
      }

      return;
    }

    const response = await Axios.post("api/tasks", {"text": value});
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
    elements.input.focus();

    this.state.current_tag = tagname;
    this.render();
  },

  changeTask: async function(task, value) {
    // TODO reset on fail? or dimmed while pending -> normal color
    const response = await Axios.post(`api/tasks/${task.id}/rename`, {text: value});
    if (response.data.status == "OK") {
      task.text = value;
      this.render();
    }
  },

  completeTask: async function(task) {
    const response = await Axios.post(`api/tasks/${task.id}/complete`);
    if (response.data.status == "OK") {
      task.completion_time = Date.now() / 1000;
      this.render();
    }
  },

  // PUBLIC //

  bind: async function() {
    // allows HTML to fully load on slow internet speed
    this.refresh();

    elements.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.submitInput();
      }
    });

    elements.input.addEventListener("input", resizeTextarea);
    resizeTextarea.call(elements.input);

    setInterval(async () => this.refresh(), 5000);
  },
};

export default App;
