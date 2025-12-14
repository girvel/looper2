import Axios from "/static/lib/axios.min.js";

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
  const current_tag = state.tags.find(tag => tag.name == state.current_tag) ?? null;
  let renderedTasks = state.tasks;
  if (current_tag !== null) {
    renderedTasks = renderedTasks.filter(t => {
      const lower = t.text.toLowerCase();
      return lower.includes(current_tag.name.toLowerCase())
        || current_tag.subtags.some(st => lower.includes(st.toLowerCase()));
    });
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
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.addEventListener("change", async () => {
      const response = await Axios.post(`/api/tasks/${task.id}`);
      if (response.data.status == "OK") {
        state.tasks = state.tasks.filter(t => t.id !== task.id);
        render();
      }
    });
    div.appendChild(cb);

    const label = document.createElement("label");
    label.textContent = task.text;
    div.appendChild(label);
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
    state.tasks.push({id: response.data.id, text: value});
    render();
    newTaskText.value = "";
  }
};

const updateTextareaHeight = () => {
  newTaskText.style.height = "auto";  // Reset to calculate shrinkage
  newTaskText.style.height = newTaskText.scrollHeight + "px";
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
