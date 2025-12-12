import Axios from "/static/lib/axios.min.js";

const tasks = document.getElementById("tasks")

const response = await Axios.get("/api/tasks");
console.log(response.data);

tasks.replaceChildren()
for (const entry of response.data) {
  const div = document.createElement("div");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.addEventListener("change", async () => {
      const response = await Axios.post(`/api/tasks/${entry.id}`);
      if (response.data.status == "OK") {
        tasks.removeChild(div);
      }
    });
    div.appendChild(cb);

    const label = document.createElement("label");
    label.textContent = entry.text;
    div.appendChild(label);
  tasks.appendChild(div);
}

