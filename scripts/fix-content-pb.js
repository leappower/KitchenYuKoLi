var fs = require("fs");
var css = fs.readFileSync("src/assets/css/styles.css", "utf-8");

// Add at end of the LG breakpoint (which is the last navigator-related rule)
var marker = 'main > section > .section-content {\n  padding-inline: 0;\n}';
var idx = css.lastIndexOf(marker);
if (idx === -1) {
  console.log("Marker not found");
  process.exit(1);
}

var insertion = '\n\n/* ─── Bottom padding for mobile/tablet bottom nav bar ────── */\n' +
'main#spa-content {\n' +
'  padding-bottom: 5rem; /* 80px — safe clearance for bottom nav bar (mobile/tablet) */\n' +
'}\n' +
'@media (width >= 768px) {\n' +
'  main#spa-content {\n' +
'    padding-bottom: 4rem; /* 64px — tablet nav bar */\n' +
'  }\n' +
'}\n' +
'@media (width >= 1024px) {\n' +
'  main#spa-content {\n' +
'    padding-bottom: 0; /* PC has no bottom nav bar */\n' +
'  }\n' +
'}\n';

css = css.substring(0, idx + marker.length) + insertion + css.substring(idx + marker.length);
fs.writeFileSync("src/assets/css/styles.css", css);
console.log("Added padding-bottom to main#spa-content");
