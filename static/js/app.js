import Axios from "/static/lib/axios.min.js";


const elements = {
  tasks: document.getElementById("tasks"),
  tags: document.getElementById("tags"),
  input: document.getElementById("input"),
};

const literals = {
  no_tasks: "-- all done --",
  no_subtags: "<no subtags>",
};

const special_tags = {
  feed: "<feed>",
}

const resizeTextarea = function() {
  this.style.height = "auto";  // Reset to calculate shrinkage
  this.style.height = this.scrollHeight + "px";
};


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

  render: function() {
    elements.tags.replaceChildren();
    elements.tags.appendChild(this.createTag(special_tags.feed));

    for (const tag of this.state.tags) {
      elements.tags.appendChild(this.createTag(tag));
    }

    elements.tasks.replaceChildren();

    let renderedTasks; {
      renderedTasks = this.state.tasks.filter(t => {
        const match = t.text.match(/@every\(([^)]+)\)/);
        if (!match) {
          return t.completion_time === null;
        }
        const expr = match[1];

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

        return t.completion_time < date.getTime() / 1000;
      });

      if (this.state.current_tag === special_tags.feed) {
        renderedTasks = renderedTasks.filter(t => {
          const lower = t.text.toLowerCase();
          return !this.state.tags.some(tag => {
            return lower.includes(tag.name.toLowerCase())
              || tag.subtags.some(st => lower.includes(st.toLowerCase()));
          });
        });
      } else {
        const current_tag = this.state.tags.find(tag => tag.name == this.state.current_tag);
        renderedTasks = renderedTasks.filter(t => {
          const lower = t.text.toLowerCase();
          return lower.includes(current_tag.name.toLowerCase())
            || current_tag.subtags.some(st => lower.includes(st.toLowerCase()));
        });
      }
    }

    if (renderedTasks.length === 0) {
      const span = document.createElement("span");
      span.className = "punctuation"
      span.innerText = literals.no_tasks;
      tasks.appendChild(span);
      return;
    }

    for (const task of renderedTasks) {
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

      const commit = async () => {
        // TODO reset on fail? or dimmed while pending -> normal color
        await Axios.post(`api/tasks/${task.id}/rename`, {text: textarea.value});
      };
      textarea.addEventListener("change", commit);
      textarea.addEventListener("keydown", async (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        await commit();
      });
      textarea.addEventListener("input", resizeTextarea);
      setTimeout(() => resizeTextarea.call(textarea), 0);

      div.appendChild(textarea);
      elements.tasks.appendChild(div);
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
