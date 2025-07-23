import { PolygonAggBars } from "../../../models/polygon/polygon.models";

// this file isn't used anywhere meaningfully
// I made it in my attempt to get the files you sent to run
// before eventually reimplementing them

namespace polygon {
    export function getNews(ticker: string, date: Date, mystery: number): void {

    }

    export async function getNDayAgg(asset: string, mystery: number): Promise<PolygonAggBars> {
        return {
            ticker: "AAAA",
            resultsCount: 0,
            results: [],
            adjusted: false,
            next_url: "",
            queryCount: 1,
            request_id: "",
            status: ""
        }
    }
}

export=polygon;
