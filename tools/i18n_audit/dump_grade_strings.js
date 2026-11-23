const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../..');
const code = fs.readFileSync(path.join(root, 'frontend/assets/data/material-grades-data.js'), 'utf8');
const sandbox = { window: {} };
new Function('window', code)(sandbox.window);
const db = sandbox.window.MW_GRADE_DATABASE;
const out = {
  densityNote: [db.densityNote],
  materialNames: [],
  overviews: [],
  applications: [],
  features: [],
  compositionLabels: [],
  mechanicalLabels: []
};
function add(arr, value) {
  if (value && typeof value === 'string' && arr.indexOf(value) === -1) arr.push(value);
}
(db.materials || []).forEach(function (material) {
  add(out.materialNames, material.name);
  (material.grades || []).forEach(function (grade) {
    add(out.overviews, grade.overview);
    add(out.applications, grade.applications);
    (grade.features || []).forEach(function (f) { add(out.features, f); });
    Object.keys(grade.composition || {}).forEach(function (label) {
      add(out.compositionLabels, label.replace(/\s*\([^)]*\)\s*$/, '').trim());
    });
    Object.keys(grade.mechanical || {}).forEach(function (label) {
      add(out.mechanicalLabels, label);
    });
  });
});
fs.writeFileSync(path.join(__dirname, 'grade_strings.json'), JSON.stringify(out, null, 2));
console.log(Object.keys(out).map(k => k + '=' + out[k].length).join(' '));
