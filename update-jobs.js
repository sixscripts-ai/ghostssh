const fs = require('fs');
const file = 'apps/api/src/routes/jobs.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'void agentMemoryService.addMemory(userId, memoryMap[body.status], "application");',
  'void agentMemoryService.addMemory(userId, memoryMap[body.status] || "Status updated", "application");'
);

code = code.replace(
  /const profile = profiles.documents\[0\];/g,
  'const profile = profiles.documents[0] as any;'
);

fs.writeFileSync(file, code);
