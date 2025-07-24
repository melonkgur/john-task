// look into:
// https://www.npmjs.com/package/cron
// https://www.npmjs.com/package/node-json-db
// https://www.npmjs.com/package/jest (for later)
// https://www.npmjs.com/package/openai

import express, { Request, Response } from "express"
import testing from "./routes/testing.route";
import dailyBrief from "./routes/dailyBrief.route";
import dailyBreifingJob from "./cron/dailyBriefingJob.service";

const app = express();
const port = 3000;

app.use("/test", testing);

app.use("/daily-brief", dailyBrief);

app.listen(port, () => {
    console.log(`Server started on port: ${port}`);
    // dailyBreifingJob.method();
})
