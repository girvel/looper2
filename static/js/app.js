import Axios from "/static/lib/axios.min.js";


const elements = {
  tasks: document.getElementById("tasks"),
  tags: document.getElementById("tags"),
  input: document.getElementById("input"),
};

const literals = {
  no_subtags: "<no subtags>",
};

const special_tags = {
  feed: "<feed>",
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
    date.setMinutes(0, 0, 0);
    date.setHours(3);
  } else if (expr === "week") {
    date.setMinutes(0, 0, 0);
    date.setHours(3);
    date.setDate(date.getDate() - date.getDay());
  } else if (expr === "month") {
    date.setMinutes(0, 0, 0);
    date.setHours(3);
    date.setDate(1);
  } else {
    return true;
  }

  return date.getTime() / 1000;
};

const doesTagMatch = (tag, task_text) => {
  const task_elements = task_text.toLowerCase().split(" ");
  return task_elements.some(
    e => tag.name.toLowerCase() == e
      || tag.subtags.some(st => st.toLowerCase() == e)
  );
}


const App = {
  state: {
    tasks: [],
    tags: [],
    current_tag: special_tags.feed,
  },

  // TODO don't allow creating <feed> tags (or alike)
  // tag is either a tag object or "<feed>"
  createTag: function(tag) {
    let name, title
    if (tag == special_tags.feed) {
      name = special_tags.feed;
      title = "Untagged tasks";
    } else {
      name = tag.name;
      title = tag.subtags.length === 0
        ? literals.no_subtags
        : tag.subtags.join(" ");
    }

    const span = document.createElement("span");
    span.innerText = name;
    span.title = title;
    span.className = "tag";

    if (this.state.current_tag === name) {
      span.classList.add("active");
    }

    span.addEventListener("click", () => {
      this.state.current_tag = name;
      this.render();
    });

    return span;
  },

  createTask: function(task) {
    const div = document.createElement("div");
    div.className = "task";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.addEventListener("change", async () => {
      const response = await Axios.post(`api/tasks/${task.id}/complete`);
      if (response.data.status == "OK") {
        this.state.tasks = this.state.tasks.filter(t => t.id !== task.id);
        this.render();
      }
    });
    div.appendChild(cb);

    const textarea = document.createElement("textarea");
    textarea.value = task.text;
    textarea.rows = 1;

    const updateText = async () => {
      // TODO reset on fail? or dimmed while pending -> normal color
      const value = textarea.value;
      const response = await Axios.post(`api/tasks/${task.id}/rename`, {text: value});
      if (response.data.status == "OK") {
        task.text = value;
        this.render();
      }
    };

    textarea.addEventListener("change", updateText);
    textarea.addEventListener("keydown", async (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      await updateText();
    });
    textarea.addEventListener("input", resizeTextarea);
    setTimeout(() => resizeTextarea.call(textarea), 0);

    div.appendChild(textarea);

    return [div, textarea];
  },

  filterTasks: function() {
    let result = this.state.tasks.filter(t => {
      const match = t.text.match(/@every\(([^)]+)\)/);
      if (!match) {
        return t.completion_time === null;
      }
      return t.completion_time < getActivationTime(match[1]);
    });

    if (this.state.current_tag === special_tags.feed) {
      result = result.filter(task => !this.state.tags.some(tag => doesTagMatch(tag, task.text)));
    } else {
      const tag = this.state.tags.find(tag => tag.name == this.state.current_tag);
      result = result.filter(task => doesTagMatch(tag, task.text));
    }

    return result;
  },

  render: function() {
    elements.tags.replaceChildren();
    elements.tags.appendChild(this.createTag(special_tags.feed));

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
      elements.input.value = "";
    }
  },

  bind: async function() {
    // allows HTML to fully load on slow internet speed
    (async () => {
      this.state.tasks = (await Axios.get("/api/tasks")).data;
      this.state.tags = (await Axios.get("/api/tags")).data;
      this.render();
    })();

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
