import { Config, JsonDB } from "node-json-db";
import { DailyBrief } from "../models/dailyBriefing.model";
import { DAILY_BRIEF_LOCATION } from "../constants/jsondb.constant";
import { MILLISECONDS_PER_DAY } from "../constants/dailyBrief.constant";

class JsonDBService {
    private db: JsonDB;

    constructor(customPath?: string) {
        this.db = new JsonDB(new Config(customPath ?? "data/db", true, true, '/'));
    }

    async getDailyBriefs(): Promise<DailyBrief[]> {
        try {
            return await this.db.getObjectDefault<DailyBrief[]>(DAILY_BRIEF_LOCATION, []);
        } catch(err) {
            console.error(`⚠️ getDailyBriefs was unable to retrieve data from json database:`, err);
            return [];
        }
    }

    async setDailyBriefs(briefs: DailyBrief[]): Promise<void> {
        try {
            await this.db.push(DAILY_BRIEF_LOCATION, briefs);
        } catch(err) {
            console.error(`⚠️ setDailyBriefs was unable to overwrite previous data:`, err);
        }
    }

    async pruneBriefs(daysOld: number): Promise<void> {
        let briefs: DailyBrief[] = await this.getDailyBriefs();

        for (let i = briefs.length - 1; i >= 0; --i) {
            const dateStrComponents = briefs[i].publishedDate.split("-");

            const year = Number.parseInt(dateStrComponents[0]);
            const month = Number.parseInt(dateStrComponents[1]);
            const day = Number.parseInt(dateStrComponents[2]);

            if (isNaN(year) || isNaN(month) || isNaN(day)) {
                console.error(
                    `⚠️ pruneBriefs was unable to parse date ${briefs[i].publishedDate} from article "${briefs[i].title}".`
                );

                briefs.splice(i, 1);

                continue;
            }

            let publishDate = new Date();

            publishDate.setFullYear(
                year,
                month,
                day
            );

            const daysBetween = (Date.now()-publishDate.getUTCDate())/MILLISECONDS_PER_DAY;

            if (daysBetween >= daysOld) {
                briefs.splice(i, 1);
            }
        }

        await this.setDailyBriefs(briefs);
    }

    async publishDailyBriefs(newBriefs: DailyBrief[]): Promise<void> {
        let briefs: DailyBrief[] = await this.getDailyBriefs();

        briefs.push(...newBriefs);

        await this.setDailyBriefs(briefs)
    }


    testService(): JsonDBService {
        let test = new JsonDBService("data/test/db");

        try {
            test.db.resetData({});
        } catch(err) {
            console.error(`⚠️ JsonDBService::testService was unable to reset test database:`, err);
        }

        return test;
    }
}

const dbService = new JsonDBService();

export default dbService;
