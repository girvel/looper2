import Axios from "/static/lib/axios.min.js";

const tasks = document.getElementById("tasks");
const newTaskText = document.getElementById("new-task-text");

let state = {
  tasks: [],
};

const no_tasks_placeholder = "-- all done --";

const render = () => {
  tasks.replaceChildren();
  if (state.tasks.length === 0) {
    const span = document.createElement("span")
    span.className = "punctuation"
    span.innerText = no_tasks_placeholder;
    tasks.appendChild(span);
    return;
  }

  for (const task of state.tasks) {
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

const submitTask = async () => {
  if (newTaskText.value === "") return;

  const response = await Axios.post("api/tasks", {"text": newTaskText.value});
  if (response.data.status === "OK") {
    state.tasks.push({id: response.data.id, text: newTaskText.value});
    render();
    newTaskText.value = "";
    newTaskText.style.height = "auto";
  }
};

const updateTextareaHeight = () => {
  newTaskText.style.height = "auto";  // Reset to calculate shrinkage
  newTaskText.style.height = newTaskText.scrollHeight + "px";
};

// allows HTML to fully load on slow internet speed
(async () => {
  const response = await Axios.get("/api/tasks");
  state.tasks = response.data;
  render();
})();

newTaskText.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    submitTask();
  }
});

newTaskText.addEventListener("input", updateTextareaHeight);
updateTextareaHeight();
