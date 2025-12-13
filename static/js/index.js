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
    });
    div.appendChild(cb);

    const label = document.createElement("label");
    label.textContent = text;
    div.appendChild(label);
  tasks.appendChild(div);
};

const submitTask = async () => {
  if (newTaskText.value === "") return;

  const response = await Axios.post("api/tasks", {"text": newTaskText.value});
  if (response.data.status === "OK") {
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
const initialize = async () => {
  const response = await Axios.get("/api/tasks");

  tasks.replaceChildren();
  for (const entry of response.data) {
    appendElement(entry.id, entry.text);
  }

  newTaskText.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitTask();
    }
  });

  newTaskText.addEventListener("input", updateTextareaHeight);
  updateTextareaHeight();
};

initialize();
