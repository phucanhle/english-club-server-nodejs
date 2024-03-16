const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const mainRouter = require("./routes");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(morgan("tiny"));
app.use("/", mainRouter);

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
