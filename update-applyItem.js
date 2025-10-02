const fs = require('fs');
const path = 'script.js';
let text = fs.readFileSync(path, 'utf8');
text = text.replace(/\s+const applyItem = \(item, immediate\) => \{\r?\n\s+teamImg\.src = item\.src;\r?\n\s+teamImg\.alt = item\.alt;\r?\n\s+if \(teamCaption\) teamCaption\.textContent = item\.caption;\r?\n\s+if \(immediate\) \{\r?\n\s+teamImg\.classList\.remove\('is-hidden'\);\r?\n\s+\}\r?\n\s+\};/, match => match.replace("if (teamCaption) teamCaption.textContent = item.caption;", "if (teamCaption) {\r\n        teamCaption.textContent = item.caption;\r\n      }").replace("if (immediate) {\r\n      teamImg.classList.remove('is-hidden');\r\n    }", "if (immediate) {\r\n      teamImg.classList.remove('is-hidden');\r\n      if (teamCaption) teamCaption.classList.remove('is-hidden');\r\n    }") );
fs.writeFileSync(path, text);
