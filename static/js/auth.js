import Axios from "/static/lib/axios.min.js";

const elements = {
  loginField: document.getElementById("login"),
  passwordField: document.getElementById("password"),
  submitButton: document.getElementById("submit"),
}

const submit = async () => {
  const response = await Axios.post("/api/auth", {
    "login": elements.loginField.value,
    "password": elements.passwordField.value
  });

  if (response.data.status == "OK") {
    window.location.href = "/";
  }
}
elements.submitButton.addEventListener("click", submit);

elements.passwordField.addEventListener("keydown", async ev => {
  if (ev.key == "Enter") await submit();
})
