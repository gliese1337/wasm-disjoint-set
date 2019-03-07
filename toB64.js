const fs = require("fs");
fs.writeFileSync(
  __dirname + "/typescript/wasm.base64.ts",
  `export default "${fs.readFileSync(__dirname + "/build/optimized.wasm").toString("base64")}"`
);
