const mainRouter = require("express").Router();
const coursesRouter = require("./coursesRouter");
const topicRouter = require("./topicRouter");
const userRouter = require("./userRouter");
const notifyRouter = require("./notifiRouter");
const assignmentRouter = require("./assignmentRouter");

mainRouter.use("/users", userRouter);
mainRouter.use("/courses", coursesRouter);
mainRouter.use("/topics", topicRouter);
mainRouter.use("/notifications", notifyRouter);
mainRouter.use("/assignments", assignmentRouter);

module.exports = mainRouter;
