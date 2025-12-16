import htm from "/static/lib/htm.min.js";

const html = htm.bind((tag, props, ...children) => {
  const element = document.createElement(tag);
  
  if (props) {
    for (const key in props) {
      if (key.startsWith("on")) {
        element.addEventListener(key.substring(2).toLowerCase(), props[key]);
      } else if (key === "className") {
        element.className = props[key];
      } else {
        element.setAttribute(key, props[key]);
      }
    }
  }

  for (const child of children.flat()) {
    if (typeof child === "string" || typeof child === "number") {
      element.appendChild(document.createTextNode(child));
    } else {
      element.appendChild(child);
    }
  };

  return element;
});

export default html;
