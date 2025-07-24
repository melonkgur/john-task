
import { Article } from "../models/article.model";
import dbService from "../services/jsondb.service"
import fmpService from "../services/financialModelingPrep.service"
import dailyBriefService from "../services/dailyBrief.service";
import dailyBreifingJob from "../cron/dailyBriefingJob.service";

// started working on it, but this file is still
// entirely unfinished

let testDb;

let holdingCallIdx = 0;

const today = new Date().toISOString().replace("T", " ");

const dateString = today.substring(0, today.indexOf("."));

describe("Daily Brief Job Tests", () => {
    beforeAll(() => {
        testDb = dbService.testService();
    })

    afterAll(() => {

    })

    afterEach(() => {
        jest.clearAllMocks();
        holdingCallIdx = 0;
    })

    describe("Generate Daily Briefing", () => {
        it("should generate daily briefing successfully", async () => {
            jest.spyOn(fmpService, "getStockNews").mockImplementation(
                jest.fn(async (symbol: string, fromDate: string, toDate: string) => {
                    return testArticles.filter((article) => article.symbol == symbol);
                })
            )

            jest.spyOn(fmpService, "getETFHoldings").mockImplementation(
                jest.fn(async (etfSymbol: string) => {
                    return [
                        {
                            symbol: "IVV",
                            asset: "AAPL",
                            name: "Apple",
                            isin: "",
                            securityCusip: "",
                            sharesNumber: 0,
                            weightPercentage: 0,
                            marketValue: 0,
                            updatedAt: dateString
                        },
                        {
                            symbol: "IVV",
                            asset: "TSLA",
                            name: "Tesla",
                            isin: "",
                            securityCusip: "",
                            sharesNumber: 0,
                            weightPercentage: 0,
                            marketValue: 0,
                            updatedAt: dateString
                        },
                        {
                            symbol: "IVV",
                            asset: "NVDA",
                            name: "Nvidia",
                            isin: "",
                            securityCusip: "",
                            sharesNumber: 0,
                            weightPercentage: 0,
                            marketValue: 0,
                            updatedAt: dateString
                        },
                        {
                            symbol: "IVV",
                            asset: "MSFT",
                            name: "Microsoft",
                            isin: "",
                            securityCusip: "",
                            sharesNumber: 0,
                            weightPercentage: 0,
                            marketValue: 0,
                            updatedAt: dateString
                        },
                        {
                            symbol: "IVV",
                            asset: "GOOGL",
                            name: "Google",
                            isin: "",
                            securityCusip: "",
                            sharesNumber: 0,
                            weightPercentage: 0,
                            marketValue: 0,
                            updatedAt: dateString
                        }
                    ];
                })
            )

            jest.spyOn(dailyBreifingJob, "method");

        })
    })
})

const testArticles: Article[] = [
    {
        "symbol": "AAPL",
        "publishedDate": dateString,
        "title": "European Commission Expected to Accept Apple's Changes to App Store",
        "image": "https://images.financialmodelingprep.com/news/european-commission-expected-to-accept-apples-changes-to-app-20250722.jpg",
        "site": "pymnts.com",
        "text": "The European Commission is reportedly likely to accept Apple's changes to its App Store rules and fees, eliminating the threat of daily fines from the antitrust regulator. The timing of an announcement of official approval of the changes is uncertain, but could come within weeks, Reuters reported Tuesday (July 22), citing unnamed sources.",
        "url": "https://www.pymnts.com/news/regulation/2025/european-commission-expected-to-accept-apples-changes-to-app-store/"
    },
    {
        "symbol": "TSLA",
        "publishedDate": dateString,
        "title": "Tesla reports steepest decline in quarterly revenue in over a decade",
        "image": "https://images.financialmodelingprep.com/news/tesla-reports-steepest-decline-in-quarterly-revenue-in-over-20250723.jpg",
        "site": "fastcompany.com",
        "text": "Tesla says it has started production of a more affordable model and expects volume production in the second half of the year.",
        "url": "https://www.fastcompany.com/91373639/tesla-steepest-decline-quarterly-revenue-over-a-decade"
    },
    {
        "symbol": "NVDA",
        "publishedDate": dateString,
        "title": "Stock Market Today: Nvidia Shares Retreat 2.5% Amid Broader Chip Sector Pullback",
        "image": "https://images.financialmodelingprep.com/news/stock-market-today-nvidia-shares-retreat-25-amid-broader-20250722.jpg",
        "site": "fool.com",
        "text": "Nvidia (NVDA -2.42%) shares declined 2.5% to close at $167.03 on July 22 as investors engaged in profit-taking following the stock's post-earnings rally. Approximately 183 million shares of the chipmaker's stock changed hands -- roughly 8% below its average volume of 200 million shares.",
        "url": "https://www.fool.com/data-news/2025/07/22/stock-market-today-nvidia-shares-retreat-25-amid-b/"
    },
    {
        "symbol": "MSFT",
        "publishedDate": dateString,
        "title": "Microsoft SharePoint's Hack: What We Know",
        "image": "https://images.financialmodelingprep.com/news/microsoft-sharepoints-hack-what-we-know-20250722.jpg",
        "site": "youtube.com",
        "text": "Hackers exploited a security flaw in common Microsoft Corp. software to breach governments, businesses and other organizations across the world and steal sensitive information, according to officials and cybersecurity researchers. Microsoft released a patch for the vulnerability in servers of the SharePoint document management software and said it was still working to roll out other fixes.",
        "url": "https://www.youtube.com/watch?v=8lZf-74GYFk"
    },
    {
        "symbol": "GOOGL",
        "publishedDate": dateString,
        "title": "Google earnings crushed forecasts — but a $10 billion capex increase is spooking Wall Street",
        "image": "https://images.financialmodelingprep.com/news/google-earnings-crushed-forecasts-but-a-10-billion-capex-increase-20250723.jpg",
        "site": "businessinsider.com",
        "text": "Alphabet beat Q2 expectations, but investors are uneasy over a surprise $10 billion capex increase. It's the latest sign that the race to stay ahead on AI is getting eye-wateringly expensive.",
        "url": "https://www.businessinsider.com/google-earnings-alphabet-crushes-q2-forecasts-capex-spike-rattles-investors-2025-7"
    },
]
