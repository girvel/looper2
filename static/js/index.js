import Axios from "/static/lib/axios.min.js";

const updateTextareaHeight = function() {
  this.style.height = "auto";  // Reset to calculate shrinkage
  this.style.height = this.scrollHeight + "px";
};

const tasks = document.getElementById("tasks");
const tags = document.getElementById("tags");
const newTaskText = document.getElementById("new-task-text");

let state = {
  tasks: [],
  tags: [],
  current_tag: null,
};

const no_tasks_placeholder = "-- all done --";

const render = () => {
  tags.replaceChildren();

  {
    const span = document.createElement("span");
    span.innerText = "<feed>";
    span.className = "tag";
    if (state.current_tag === null) {
      span.classList.add("active");
    }
    span.addEventListener("click", () => {
      state.current_tag = null;
      render();
    });
    tags.appendChild(span);
  }

  for (const tag of state.tags) {
    const span = document.createElement("span");
    span.innerText = tag.name;
    span.title = tag.subtags.length === 0 ? "<no subtags>" : tag.subtags.join(" ");
    span.className = "tag";
    if (state.current_tag === tag.name) {
      span.classList.add("active");
    }
    span.addEventListener("click", () => {
      state.current_tag = tag.name;
      render();
    });

    tags.appendChild(span);
  }

  tasks.replaceChildren();

  let renderedTasks; {
    renderedTasks = state.tasks
      .filter(t => t.completion_time === null);

    const current_tag = state.tags.find(tag => tag.name == state.current_tag) ?? null;
    if (current_tag === null) {
      renderedTasks = renderedTasks.filter(t => {
        const lower = t.text.toLowerCase();
        return !state.tags.some(tag => {
          return lower.includes(tag.name.toLowerCase())
            || tag.subtags.some(st => lower.includes(st.toLowerCase()));
        });
      });
    } else {
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
    span.innerText = no_tasks_placeholder;
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
        state.tasks = state.tasks.filter(t => t.id !== task.id);
        render();
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
    textarea.addEventListener("input", updateTextareaHeight);
    setTimeout(() => updateTextareaHeight.call(textarea), 0);

    div.appendChild(textarea);
    tasks.appendChild(div);
  }
};

const submitInput = async () => {
  const value = newTaskText.value
  if (value === "") return;

  if (value.startsWith(":")) {
    const args = value.split(" ");

    if (args[0] == ":Tag") {
      const response = await Axios.post("api/tags", {"name": args[1], "subtags": args.slice(2)});

      if (response.data.status === "OK") {
        state.tags = (await Axios.get("/api/tags")).data;
        render();
        newTaskText.value = "";
      }
    } else if (args[0] == ":TagRemove") {
      const response = await Axios.post("api/tags/remove", {"name": args[1]});

      if (response.data.status === "OK") {
        state.tags = (await Axios.get("/api/tags")).data;
        render();
        newTaskText.value = "";
      }
    }

    return;
  }

  const response = await Axios.post("api/tasks", {"text": value});
  if (response.data.status === "OK") {
    state.tasks.push({id: response.data.id, text: value, completion_time: null});
    render();
    newTaskText.value = "";
  }
};

// allows HTML to fully load on slow internet speed
(async () => {
  state.tasks = (await Axios.get("/api/tasks")).data;
  state.tags = (await Axios.get("/api/tags")).data;
  render();
})();

newTaskText.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    submitInput();
  }
});

newTaskText.addEventListener("input", updateTextareaHeight);
updateTextareaHeight();
