import Axios from "/static/lib/axios.min.js";

const elements = {
  loginField: document.getElementById("login"),
  passwordField: document.getElementById("password"),
  submitButton: document.getElementById("submit"),
}

elements.submitButton.addEventListener("click", async () => {
  const response = await Axios.post("/api/auth", {
    "login": elements.loginField.value,
    "password": elements.passwordField.value
  });

  if (response.data.status == "OK") {
    window.location.href = "/";
  }
});
