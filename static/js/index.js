import Axios from "/static/lib/axios.min.js";

const tasks = document.getElementById("tasks");
const newTaskText = document.getElementById("new-task-text");

const appendElement = (id, text) => {
  const div = document.createElement("div");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.addEventListener("change", async () => {
      const response = await Axios.post(`/api/tasks/${id}`);
      if (response.data.status == "OK") {
        tasks.removeChild(div);
      }

      if (tasks.children.length === 0) {
        const span = document.createElement("span")
        span.className = "punctuation"
        span.innerText = no_tasks_placeholder;
        tasks.appendChild(span);
      }
    });
    div.appendChild(cb);

    const label = document.createElement("label");
    label.textContent = text;
    div.appendChild(label);
  tasks.appendChild(div);
};

const no_tasks_placeholder = "-- all done --";

const submitTask = async () => {
  if (newTaskText.value === "") return;

  const response = await Axios.post("api/tasks", {"text": newTaskText.value});
  if (response.data.status === "OK") {
    if (tasks.children[0].innerText === no_tasks_placeholder) {
      tasks.replaceChildren();
    }

    appendElement(response.data.id, newTaskText.value);
    newTaskText.value = "";
    newTaskText.style.height = "auto";
  }
};

const updateTextareaHeight = () => {
  newTaskText.style.height = "auto";  // Reset to calculate shrinkage
  newTaskText.style.height = newTaskText.scrollHeight + "px";
};

// allows HTML to fully load on slow internet speed
const refreshTasks = async () => {
  const response = await Axios.get("/api/tasks");
  const entries = response.data;

  tasks.replaceChildren();
  if (entries.length === 0) {
    const span = document.createElement("span")
    span.className = "punctuation"
    span.innerText = no_tasks_placeholder;
    tasks.appendChild(span);
  } else {
    for (const entry of entries) {
      appendElement(entry.id, entry.text);
    }
  }
};

refreshTasks();

newTaskText.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    submitTask();
  }
});

newTaskText.addEventListener("input", updateTextareaHeight);
updateTextareaHeight();
