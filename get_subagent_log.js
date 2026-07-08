const fs = require('fs');
const lines = fs.readFileSync('/Users/mattiaianniello/.gemini/antigravity/brain/dcd6e97d-ab83-40c0-85de-65e2a9d43858/.system_generated/logs/transcript_full.jsonl', 'utf-8').split('\n');
for (const line of lines) {
  if (!line) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.tool_calls) {
      for (const call of obj.tool_calls) {
        if (call.name === 'send_message') {
          console.log(call.args.Message);
        }
      }
    }
  } catch (e) {}
}
