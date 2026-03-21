const fs = require('fs');
const file = 'apps/api/src/services/agent.service.ts';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('agentMemoryService')) {
  code = "import { agentMemoryService } from '../agent/memory.service.js';\n" + code;
  code = code.replace("return {profile,jobs:top,kits,opinions,provi\nderUsed:input.provider};", "void agentMemoryService.synthesizePreferences(input.githubUsername || \"anonymous\");\n    return {profile,jobs:top,kits,opinions,providerUsed:input.provider};");
  code = code.replace("return {profile,jobs:top,kits,opinions,providerUsed:input.provider};", "void agentMemoryService.synthesizePreferences(input.githubUsername || \"anonymous\");\n    return {profile,jobs:top,kits,opinions,providerUsed:input.provider};");
  fs.writeFileSync(file, code);
}
