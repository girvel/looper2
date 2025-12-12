import Axios from "/static/lib/axios.min.js";

const tasks = document.getElementById("tasks");
const newTaskText = document.getElementById("new-task-text");
const newTaskButton = document.getElementById("new-task-button");

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
}

const response = await Axios.get("/api/tasks");
console.log(response.data);

tasks.replaceChildren()
for (const entry of response.data) {
  appendElement(entry.id, entry.text);
}

newTaskButton.addEventListener("click", async () => {
  const response = await Axios.post("api/tasks", {"text": newTaskText.value});
  if (response.data.status == "OK") {
    appendElement(response.data.id, newTaskText.value);
    newTaskText.value = "";
  }
})
