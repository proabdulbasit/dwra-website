const app = require("./app");
const { port } = require("./config");

app.listen(port, () => {
  console.log(`DWRA API running on http://localhost:${port}`);
});
