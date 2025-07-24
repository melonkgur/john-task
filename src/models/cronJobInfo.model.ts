import { CronJob } from "cron";

interface CronJobInfo {
    cronJob: CronJob,
    method: () => Promise<void>
}

export { CronJobInfo };
