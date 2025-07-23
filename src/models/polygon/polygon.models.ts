
// this file isn't used anywhere meaningfully
// I made it in my attempt to get the files you sent to run
// before eventually reimplementing them

type InsightSentiment = "positive" | "negative" | "neutral";

type PolygonRequestStatus = "OK" | "";

interface PolygonNewsInsight {
    sentiment: InsightSentiment,
    sentiment_reasoning: string,
    ticker: string
}

interface PolygonNewsPublisher {
    favicon_url: string,
    homepage_url: string,
    logo_url: string,
    name: string
}

interface PolygonNewsResult {
    amp_url: string,
    article_url: string,
    author: string,
    description: string,
    id: string,
    image_url: string,
    insights: PolygonNewsInsight[],
    keywords: string[],
    published_utc: string, // despite the name, this does not appear to be a Date object
    publisher: PolygonNewsPublisher,
    tickers: string[]
    title: string,
}

interface PolygonNews  {
    count: number,
    next_url: string,
    request_id: string
    results: PolygonNewsResult[],
    status: PolygonRequestStatus
}

// magic numbers galore!
interface PolygonAggBarsResult {
    c: number,
    o: number,
    h: number,
    l: number,
    n: number,
    t: number,
    v: number,
    vw: number
}

interface PolygonAggBars {
    ticker: string,
    resultsCount: number,
    results: PolygonAggBarsResult[],
    adjusted: boolean,
    next_url: string,
    queryCount: number,
    request_id: string,
    status: PolygonRequestStatus
}

export {
    PolygonAggBars,
    PolygonAggBarsResult,
    PolygonNews,
    PolygonNewsResult,
    PolygonNewsPublisher,
    PolygonNewsInsight,
    PolygonRequestStatus,
    InsightSentiment
};
