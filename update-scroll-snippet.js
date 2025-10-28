const fs = require('fs');
const path = 'script.js';

const oldSnippet = [
  "        const scrollToSection = () => {",
  "          const baseHeader = headerEl ? headerEl.offsetHeight : 0;",
  "          const offset = baseHeader + 16;",
  "          const previousMargin = scrollNode.style.scrollMarginTop;",
  "          scrollNode.style.scrollMarginTop = `${offset}px`;",
  "          const restoreMargin = () => {",
  "            if (previousMargin) scrollNode.style.scrollMarginTop = previousMargin;",
  "            else scrollNode.style.removeProperty('scroll-margin-top');",
  "          };",
  "          const doScroll = () => {",
  "            if (typeof scrollNode.scrollIntoView === 'function') {",
  "              try {",
  "                scrollNode.scrollIntoView({ behavior: 'smooth', block: 'start' });",
  "                return;",
  "              } catch (err) { /* fall back */ }",
  "            }",
  "            const rect = scrollNode.getBoundingClientRect();",
  "            const finalTop = Math.max(0, rect.top + window.pageYOffset - offset);",
  "            try { window.scrollTo({ top: finalTop, behavior: 'smooth' }); }",
  "            catch { window.scrollTo(0, finalTop); }",
  "          };",
  "          doScroll();",
  "          setTimeout(restoreMargin, 700);",
  "        };"
].join('\n');

const newSnippet = [
  "        const scrollToSection = () => {",
  "          const previousMargin = scrollNode.style.scrollMarginTop;",
  "          const getOffset = () => (headerEl ? headerEl.offsetHeight : 0) + 16;",
  "          const restoreMargin = () => {",
  "            if (previousMargin) scrollNode.style.scrollMarginTop = previousMargin;",
  "            else scrollNode.style.removeProperty('scroll-margin-top');",
  "          };",
  "          const doScroll = () => {",
  "            const offset = getOffset();",
  "            scrollNode.style.scrollMarginTop = `${offset}px`;",
  "            if (typeof scrollNode.scrollIntoView === 'function') {",
  "              try {",
  "                scrollNode.scrollIntoView({ behavior: 'smooth', block: 'start' });",
  "                return;",
  "              } catch (err) { /* fall back */ }",
  "            }",
  "            const rect = scrollNode.getBoundingClientRect();",
  "            const finalTop = Math.max(0, rect.top + window.pageYOffset - offset);",
  "            try { window.scrollTo({ top: finalTop, behavior: 'smooth' }); }",
  "            catch { window.scrollTo(0, finalTop); }",
  "          };",
  "          requestAnimationFrame(doScroll);",
  "          setTimeout(restoreMargin, 600);",
  "        };"
].join('\n');

const text = fs.readFileSync(path, 'utf8');
const normalized = text.replace(/\r\n/g, '\n');

if (!normalized.includes(oldSnippet)) {
  if (normalized.includes(newSnippet)) {
    console.log('New snippet already applied; no changes made.');
    process.exit(0);
  }
  throw new Error('old snippet not found');
}

const updated = normalized.replace(oldSnippet, newSnippet);
const restoreLineEndings = text.includes('\r\n')
  ? updated.replace(/\n/g, '\r\n')
  : updated;

fs.writeFileSync(path, restoreLineEndings);
