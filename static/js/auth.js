import Axios from "/static/lib/axios.min.js";

const elements = {
  loginField: document.getElementById("login"),
  passwordField: document.getElementById("password"),
  submitButton: document.getElementById("submit"),
  status: document.getElementById("status"),
}

const submit = async () => {
  try {
    const response = await Axios.post("/api/auth", {
      "login": elements.loginField.value,
      "password": elements.passwordField.value
    });
    console.assert(response.data.status == "OK");
    window.location.href = "/";
  } catch (error) {
    if (error.response) {
      if (error.response.status == 400) {
        elements.status.innerText = "Invalid format";
      } else if (error.response.status == 409) {
        elements.status.innerText = "Wrong login/password";
      } else {
        elements.status.innerText = "Unknown server error";
      }
    } else if (error.request) {
      elements.status.innerText = "Connection issues";
    } else {
      elements.status.innerText = "Unknown error";
    }
  }
}

elements.submitButton.addEventListener("click", submit);
elements.passwordField.addEventListener("keydown", async ev => {
  if (ev.key == "Enter") await submit();
})
