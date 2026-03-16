const fs = require('fs');
let eventsContent = fs.readFileSync('src/app/(web)/events/page.tsx', 'utf8');
eventsContent = eventsContent.replace(/className=\\{\\r?elative bg-\\[#0a0f25\\] border-2 rounded-\\[2rem\\] overflow-hidden group \\\\}/g, 'className={\elative bg-[#0a0f25] border-2 rounded-[2rem] overflow-hidden group \ transition-all duration-500\}');
eventsContent = eventsContent.replace(/className=\\{\\$/g, 'className={\');
eventsContent = eventsContent.replace(/\\}/g, '\}');

fs.writeFileSync('src/app/(web)/events/page.tsx', eventsContent);

let rosterContent = fs.readFileSync('src/app/(web)/roster/page.tsx', 'utf8');
rosterContent = rosterContent.replace(/className=\\{\\group relative px-10 py-4 transform hover:scale-105 transition-all duration-300 \\\\}/g, 'className={\group relative px-10 py-4 transform hover:scale-105 transition-all duration-300 \\}');
rosterContent = rosterContent.replace(/className=\\{\\bsolute inset-0 skew-x-\\[-15deg\\] border-2 transition-all duration-300 \\\\}/g, 'className={\bsolute inset-0 skew-x-[-15deg] border-2 transition-all duration-300 \\}');
rosterContent = rosterContent.replace(/className=\\{\\elative z-10 font-bold tracking-widest uppercase \\\\}/g, 'className={\elative z-10 font-bold tracking-widest uppercase \\}');

fs.writeFileSync('src/app/(web)/roster/page.tsx', rosterContent);
