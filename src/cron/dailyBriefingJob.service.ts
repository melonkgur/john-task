import { CronJob } from "cron";
import fmpService from "../services/financialModelingPrep.service";
import dailyBriefService from "../services/dailyBrief.service";
import { AnalyzedArticle } from "../models/article.model";
import { EnrichedArticle } from "../models/dailyBriefing.model";
import { ETF_SYMBOL, MILLISECONDS_PER_DAY } from "../constants/dailyBrief.constant";
import dbService from "../services/jsondb.service";
import { CronJobInfo } from "../models/cronJobInfo.model";

async function generateDailyBreifing() {
    console.log("[ℹ️ generateDailBriefing] gathering date information...");
    const today = new Date();

    let fromDate;
    let trimDays;
    if (today.getDay() == 1) {
        // get from midnight three days ago
        fromDate = new Date(Date.now()-MILLISECONDS_PER_DAY*3);
        trimDays = 4;
    } else {
        fromDate = new Date(Date.now()-MILLISECONDS_PER_DAY*3);
        trimDays = 2;
    }

    fromDate.setHours(0, 0, 0, 0);

    const toDateString = today.toISOString();
    const fromDateString = fromDate.toISOString();

    console.log("[ℹ️ generateDailBriefing] gathering & analyzing articles...");
    const analyzed: AnalyzedArticle[] = await fmpService.findMostImpactfulNews(
        ETF_SYMBOL,
        fromDateString.substring(0, fromDateString.indexOf("T")),
        toDateString.substring(0, toDateString.indexOf("T"))
    );

    console.log("[ℹ️ generateDailBriefing] generating images for articles...");
    const enriched: EnrichedArticle[] = await dailyBriefService.enrichArticles(analyzed);


    console.log("[ℹ️ generateDailBriefing] finalizing data...");
    const breifs = dailyBriefService.finalizeArticles(enriched);

    console.log("[ℹ️ generateDailBriefing] updating database...");

    await dbService.pruneBriefs(trimDays);
    await dbService.publishDailyBriefs(breifs);

    console.log("[ℹ️ generateDailBriefing] daily briefs generated.");
}

const cronJob = new CronJob(
    "0 9 * * 0-5", // run daily at 9AM except on weekends
    generateDailyBreifing,
    null,
    true, // do not start automatically
    'America/New_York'
);

const dailyBreifingJob: CronJobInfo = {
    cronJob,
    method: generateDailyBreifing
}

export default dailyBreifingJob;
