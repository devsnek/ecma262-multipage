'use strict';

const fs = require('fs');
const { JSDOM } = require('jsdom');

const {
  window: {
    document,
  },
} = new JSDOM(fs.readFileSync('./ecma262/out/index.html', 'utf8'));

const links = new Map();
const linksForJson = {};
function registerLinks(page, node) {
  const all = [];
  if (node.id) {
    links.set(`#${node.id}`, `${page}#${node.id}`);
    all.push(node.id);
  }
  Array.from(node.querySelectorAll('[id]')).forEach((n) => {
    links.set(`#${n.id}`, `${page}#${n.id}`);
    if (!n.id.startsWith('_ref')) {
      all.push(n.id);
    }
  });
  linksForJson[page] = all;
}

const pages = new Map();
pages.set('index', document.createElement('div'));

let hasIntro = false;
Array.from(document.querySelector('#spec-container').children).forEach((c) => {
  if (!hasIntro) {
    registerLinks('index.html', c);
    pages.get('index').appendChild(c);
    if (c.nodeName === 'EMU-INTRO') {
      hasIntro = true;
    }
  } else {
    if (!c.id) {
      throw new Error('Element cannot be used as page because it is missing an id');
    }
    pages.set(c.id, c);
    registerLinks(`${c.id}.html`, c);
  }
});

// hack: add index div to document so below rewrites can reach it.
// don't perform restructuring after this point.
document.body.appendChild(pages.get('index'));

Array.from(document.querySelectorAll('a')).forEach((a) => {
  const href = a.getAttribute('href');
  if (links.has(href)) {
    a.setAttribute('href', links.get(href));
  }
});

const REWRITE_SCRIPT = `\
'use strict';

if (document.location.hash) {
  const obj = JSON.parse(${JSON.stringify(JSON.stringify(linksForJson))});
  for (const [page, ids] of Object.entries(obj)) {
    if (ids.includes(document.location.hash.slice(1))) {
      window.location.href = page + document.location.hash;
      break;
    }
  }
}
`;

function format(e) {
  return `\
<!DOCTYPE html>
<html>
  <head>
    <script>
    ${REWRITE_SCRIPT}
    </script>
    ${document.head.innerHTML}
  </head>
  <body>
    ${document.querySelector('#menu-toggle').outerHTML}
    ${document.querySelector('#menu-spacer').outerHTML}
    ${document.querySelector('#menu').outerHTML}
    <div id="spec-container">
      ${e.outerHTML}
    </div>
  </body>
</html>
`;
}

pages.forEach((e, id) => {
  fs.writeFileSync(`./build/${id}.html`, format(e));
});

const FIND = 'if (\'#\' + path[index].id === children[i].children[1].getAttribute(\'href\')) {';
const REPLACE = 'if (path[index].id === children[i].children[1].getAttribute(\'href\').split(\'#\')[1]) {';
fs.writeFileSync('./build/ecmarkup.js', fs.readFileSync('./build/ecmarkup.js', 'utf8')
  .replace(FIND, REPLACE));
