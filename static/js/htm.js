import htm from "/static/lib/htm.min.js";

const properties = new Set(["className", "value", "checked", "disabled"]);

/// Uses className instead of class
const html = htm.bind((tag, props, ...children) => {
  const element = document.createElement(tag);
  
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (key.startsWith("on")) {
        element.addEventListener(key.substring(2).toLowerCase(), value);
      } else if (properties.has(key) || key.startsWith("_")) {
        element[key] = value;
      } else {
        element.setAttribute(key, value);
      }
    }
  }

  for (const child of children.flat()) {
    // Support conditional operator-based branching in ${}
    if (child === null || child === undefined || child === false || child === true) continue;

    if (typeof child === "string" || typeof child === "number") {
      element.appendChild(document.createTextNode(child));
    } else {
      element.appendChild(child);
    }
  };

  return element;
});

export default html;
