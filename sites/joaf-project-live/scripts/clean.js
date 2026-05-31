
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const targets = [
  'dist', '.cache', 'build', '.netlify', 'node_modules/.cache',
];

function rm(target) {
  const full = path.join(root, target);
  try {
    fs.rmSync(full, { recursive: true, force: true });
    console.log(`removed ${target}`);
  } catch (err) {
    console.warn(`skip ${target}: ${err.message}`);
  }
}

targets.forEach(rm);
