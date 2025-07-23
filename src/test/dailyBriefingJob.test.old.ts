// import { MongoMemoryServer } from "mongodb-memory-server"
// import financialModelingPrepService from "../../src/services/app/financialModelingPrep/financialModelingPrep.service"
import PolygonService from "../services/appV2/polygon/polygonService"
import { PolygonAggBars, PolygonNews } from "../models/polygon/polygon.models"
// import OpenAIService from "../../src/services/appV3/ai/openai.service"
// import CustomerIOService from "../../src/services/appV3/notifications/customerio.service"
import { generateDailyBriefing } from "../cron/services/dailyBriefingJob.service"
// import { S3 } from "aws-sdk"
import { S3 } from "../pseudo_aws/aws_sdk"
import axios from "axios"
// import stockProfileService from "../../src/services/app/stockProfile/stockProfile.service"
import { DailyBriefingModel } from "../models/dailyBriefing.model"
// import DailyBriefingService from "../../src/services/webV2/dailyBriefing.service"
import * as dailyBriefingJobService from "../cron/services/dailyBriefingJob.service"

// const dbHandler = require("../db.setup")

// let mongod: MongoMemoryServer

const ARTICLE_BLOCK_HOUR = 16

describe("Daily Briefing Job Tests", () => {
    beforeAll(async () => {
        // TODO: replace
        // mongod = await dbHandler.connect()
    })

    afterAll(async () => {
        // TODO: replace
        // await dbHandler.clearDatabase()
        // await dbHandler.closeDatabase(mongod)
        jest.clearAllMocks()
    })

    afterEach(async () => {
        jest.clearAllMocks()
    })

    describe("Generate Daily Briefing", () => {
        beforeEach(() => {
            // Mock isWeekend to return false so the job always runs
            jest.spyOn(dailyBriefingJobService, "isWeekend").mockImplementation(() => false)
        })

        it("should generate daily briefing successfully", async () => {
            // Mock ETF holdings
            jest.spyOn(financialModelingPrepService, "getEtfHoldingsStable").mockResolvedValue([
                {
                    asset: "AAPL",
                    symbol: "IVV",
                    name: "APPLE INC",
                    weightPercentage: 3.556,
                    isin: "",
                    securityCusip: "",
                    sharesNumber: 0,
                    marketValue: 0,
                    updatedAt: undefined,
                    updated: undefined,
                },
                {
                    asset: "TSLA",
                    symbol: "IVV",
                    name: "TESLA INC",
                    weightPercentage: 2.5,
                    isin: "",
                    securityCusip: "",
                    sharesNumber: 0,
                    marketValue: 0,
                    updatedAt: undefined,
                    updated: undefined,
                },
            ])

            // Mock polygon aggregates
            jest.spyOn(PolygonService, "getNDayAgg").mockImplementation(
                jest.fn((ticker: string) => {
                    return Promise.resolve(polygonData.find((data) => data.ticker === ticker))
                })
            )

            jest.spyOn(PolygonService, "getNews").mockResolvedValue(mockPolygonNews)

            jest.spyOn(axios, "get").mockResolvedValue({ data: {} })

            jest.spyOn(S3.prototype, "upload").mockReturnValue({
                promise: () => Promise.resolve({ Location: "https://example.com/image.jpg" }),
            } as any)

            jest.spyOn(OpenAIService, "generateChatCompletion").mockResolvedValue(
                "📱 Apple launches new iPhone, stock soars\n💡 Tesla unveils innovative battery tech\n💰 Microsoft's AI investments pay off"
            )

            jest.spyOn(stockProfileService, "getInstrumentDetails").mockResolvedValue({})
            jest.spyOn(DailyBriefingService, "createDailyBriefing")

            const customerIOSpy = jest
                .spyOn(CustomerIOService, "sendBroadcastTrigger")
                .mockResolvedValue()

            const result = await generateDailyBriefing()
            expect(result.length).toBeGreaterThan(0)
            expect(result[0]).toHaveProperty("symbol")
            expect(result[0]).toHaveProperty("text")
            expect(result[0]).toHaveProperty("url")
            expect(result[0]).toHaveProperty("change")
            expect(result[0]).toHaveProperty("imageUrl")
            expect(result[0]).toHaveProperty("change")
            expect(result[0]).toHaveProperty("etfInformation")

            expect(customerIOSpy).toHaveBeenCalled()
            expect(DailyBriefingService.createDailyBriefing).toHaveBeenCalled()
            const yesterday = new Date(new Date().setDate(new Date().getDate() - 1))
            yesterday.setHours(ARTICLE_BLOCK_HOUR, 0, 0, 0)
            expect(PolygonService.getNews).toHaveBeenNthCalledWith(2, "TSLA", yesterday, 10)
            expect(PolygonService.getNews).toHaveBeenNthCalledWith(1, "AAPL", yesterday, 10)

            const dailyBriefing = await DailyBriefingModel.findOne()
            expect(dailyBriefing).not.toBeNull()
            expect(dailyBriefing.news.length).toBeGreaterThan(0)
            expect(dailyBriefing.news[0]).toHaveProperty("symbol")
            expect(dailyBriefing.news[0]).toHaveProperty("text")
            expect(dailyBriefing.news[0]).toHaveProperty("url")
            expect(dailyBriefing.news[0]).toHaveProperty("imageUrl")
            expect(dailyBriefing.news[0]).toHaveProperty("change")
            expect(dailyBriefing.news[0]).toHaveProperty("etfInformation")
        })

        it("No news since the articles are already in the database", async () => {
            const dailyBriefing = await DailyBriefingModel.find()
            jest.spyOn(financialModelingPrepService, "getEtfHoldingsStable").mockResolvedValue([
                {
                    asset: "AAPL",
                    symbol: "IVV",
                    name: "APPLE INC",
                    weightPercentage: 3.556,
                    isin: "",
                    securityCusip: "",
                    sharesNumber: 0,
                    marketValue: 0,
                    updatedAt: undefined,
                    updated: undefined,
                },
                {
                    asset: "TSLA",
                    symbol: "IVV",
                    name: "TESLA INC",
                    weightPercentage: 2.5,
                    isin: "",
                    securityCusip: "",
                    sharesNumber: 0,
                    marketValue: 0,
                    updatedAt: undefined,
                    updated: undefined,
                },
            ])

            // Mock polygon aggregates
            jest.spyOn(PolygonService, "getNDayAgg").mockImplementation(
                jest.fn((ticker: string) => {
                    return Promise.resolve(polygonData.find((data) => data.ticker === ticker))
                })
            )

            jest.spyOn(PolygonService, "getNews").mockResolvedValue(mockPolygonNews)

            jest.spyOn(axios, "get").mockResolvedValue({ data: {} })

            jest.spyOn(S3.prototype, "upload").mockReturnValue({
                promise: () => Promise.resolve({ Location: "https://example.com/image.jpg" }),
            } as any)

            jest.spyOn(OpenAIService, "generateChatCompletion").mockResolvedValue(
                "📱 Apple launches new iPhone, stock soars\n💡 Tesla unveils innovative battery tech\n💰 Microsoft's AI investments pay off"
            )

            jest.spyOn(stockProfileService, "getInstrumentDetails").mockResolvedValue({})
            jest.spyOn(DailyBriefingService, "createDailyBriefing")

            const result = await generateDailyBriefing()
            expect(result.length).toBe(0)
            const dailyBriefing2 = await DailyBriefingModel.find()
            expect(dailyBriefing2.length).toBe(dailyBriefing.length)
        })

        it("Should create daily briefing, news should work fine because it is more than 10 days apart", async () => {
            jest.spyOn(financialModelingPrepService, "getEtfHoldingsStable").mockResolvedValue([
                {
                    asset: "AAPL",
                    symbol: "IVV",
                    name: "APPLE INC",
                    weightPercentage: 3.556,
                    isin: "",
                    securityCusip: "",
                    sharesNumber: 0,
                    marketValue: 0,
                    updatedAt: undefined,
                    updated: undefined,
                },
                {
                    asset: "TSLA",
                    symbol: "IVV",
                    name: "TESLA INC",
                    weightPercentage: 2.5,
                    isin: "",
                    securityCusip: "",
                    sharesNumber: 0,
                    marketValue: 0,
                    updatedAt: undefined,
                    updated: undefined,
                },
            ])

            for (let i = 0; i < 10; i++) {
                const date = new Date()
                date.setDate(date.getDate() - i)
                await DailyBriefingModel.create({
                    date: date,
                    news: [],
                })
            }

            // Mock polygon aggregates
            jest.spyOn(PolygonService, "getNDayAgg").mockImplementation(
                jest.fn((ticker: string) => {
                    return Promise.resolve(polygonData.find((data) => data.ticker === ticker))
                })
            )

            jest.spyOn(PolygonService, "getNews").mockResolvedValue(mockPolygonNews)

            jest.spyOn(axios, "get").mockResolvedValue({ data: {} })

            jest.spyOn(S3.prototype, "upload").mockReturnValue({
                promise: () => Promise.resolve({ Location: "https://example.com/image.jpg" }),
            } as any)

            jest.spyOn(OpenAIService, "generateChatCompletion").mockResolvedValue(
                "📱 Apple launches new iPhone, stock soars\n💡 Tesla unveils innovative battery tech\n💰 Microsoft's AI investments pay off"
            )

            jest.spyOn(stockProfileService, "getInstrumentDetails").mockResolvedValue({})
            jest.spyOn(DailyBriefingService, "createDailyBriefing")

            const result = await generateDailyBriefing()
            expect(result.length).toBe(2)
            const dailyBriefing = await DailyBriefingModel.find()
            let copies = 0
            for (const article of result) {
                for (const briefing of dailyBriefing) {
                    for (const news of briefing.news) {
                        if (article.symbol === news.symbol) {
                            copies++
                        }
                    }
                }
            }
            expect(copies).toBe(4) //the 2 that were created and the 2 that were already in the database
        })

        it("Should ignore news that's image is an html page", async () => {
            jest.spyOn(financialModelingPrepService, "getEtfHoldingsStable").mockResolvedValue([
                {
                    asset: "AAPL",
                    symbol: "IVV",
                    name: "APPLE INC",
                    weightPercentage: 3.556,
                    isin: "",
                    securityCusip: "",
                    sharesNumber: 0,
                    marketValue: 0,
                    updatedAt: undefined,
                    updated: undefined,
                },
                {
                    asset: "TSLA",
                    symbol: "IVV",
                    name: "TESLA INC",
                    weightPercentage: 2.5,
                    isin: "",
                    securityCusip: "",
                    sharesNumber: 0,
                    marketValue: 0,
                    updatedAt: undefined,
                    updated: undefined,
                },
            ])

            // Mock polygon aggregates
            jest.spyOn(PolygonService, "getNDayAgg").mockImplementation(
                jest.fn((ticker: string) => {
                    return Promise.resolve(polygonData.find((data) => data.ticker === ticker))
                })
            )

            jest.spyOn(PolygonService, "getNews").mockResolvedValue(mockPolygonNews2)

            jest.spyOn(axios, "get").mockResolvedValue({ data: {} })

            jest.spyOn(S3.prototype, "upload").mockReturnValue({
                promise: () => Promise.resolve({ Location: "https://example.com/image.jpg" }),
            } as any)

            jest.spyOn(OpenAIService, "generateChatCompletion").mockResolvedValue(
                "📱 Apple launches new iPhone, stock soars\n💡 Tesla unveils innovative battery tech\n💰 Microsoft's AI investments pay off"
            )

            jest.spyOn(stockProfileService, "getInstrumentDetails").mockResolvedValue({})
            jest.spyOn(DailyBriefingService, "createDailyBriefing")

            const result = await generateDailyBriefing()
            expect(result.length).toBe(1)
            expect(result[0].symbol).toBe("TSLA")
        })

        it("should handle empty holdings gracefully", async () => {
            jest.spyOn(financialModelingPrepService, "getEtfHoldingsStable").mockResolvedValue([])

            const result = await generateDailyBriefing()

            expect(result).toEqual([])
        })

        it("should not generate briefing on weekends", async () => {
            jest.spyOn(dailyBriefingJobService, "isWeekend").mockImplementation(() => true)
            const result = await generateDailyBriefing()
            expect(result).toEqual([])
        })
    })
})

const mockPolygonNews: PolygonNews = {
    count: 2,
    next_url: "https://api.polygon.io/v2/reference/news?page=2",
    request_id: "12345-abcde",
    results: [
        {
            amp_url: "https://www.example.com/article1/amp",
            article_url: "https://www.example.com/article1",
            author: "Jane Doe",
            description:
                "Tech giant Apple sees a surge in stock price after strong earnings report.",
            id: "article-001",
            image_url: "https://www.example.com/images/article1.jpg",
            insights: [
                {
                    sentiment: "positive",
                    sentiment_reasoning:
                        "Apple's revenue exceeded expectations, driving stock price up.",
                    ticker: "AAPL",
                },
            ],
            keywords: ["Apple", "Earnings", "Stock Market"],
            published_utc: "2024-01-29T14:30:00Z",
            publisher: {
                favicon_url: "https://www.example.com/favicon.ico",
                homepage_url: "https://www.example.com",
                logo_url: "https://www.example.com/logo.png",
                name: "Example News",
            },
            tickers: ["AAPL"],
            title: "Apple Stock Surges After Strong Earnings Report",
        },
        {
            amp_url: "https://www.example.com/article2/amp",
            article_url: "https://www.example.com/article2",
            author: "John Smith",
            description: "Tesla announces record-breaking delivery numbers for Q4 2023.",
            id: "article-002",
            image_url: "https://www.example.com/images/article2.jpg",
            insights: [
                {
                    sentiment: "positive",
                    sentiment_reasoning:
                        "Tesla's deliveries surpassed analysts' estimates, boosting investor confidence.",
                    ticker: "TSLA",
                },
            ],
            keywords: ["Tesla", "EV Market", "Stock Performance"],
            published_utc: "2024-01-29T12:00:00Z",
            publisher: {
                favicon_url: "https://www.example2.com/favicon.ico",
                homepage_url: "https://www.example2.com",
                logo_url: "https://www.example2.com/logo.png",
                name: "Market Watch",
            },
            tickers: ["TSLA"],
            title: "Tesla Reports Record-Breaking Q4 Deliveries",
        },
    ],
    status: "OK",
}

const mockPolygonNews2: PolygonNews = {
    count: 2,
    next_url: "https://api.polygon.io/v2/reference/news?page=2",
    request_id: "12345-abcde",
    results: [
        {
            amp_url: "https://www.example.com/article1/amp",
            article_url: "https://www.example.com/article3",
            author: "Jane Doe",
            description:
                "Tech giant Apple sees a surge in stock price after strong earnings report.",
            id: "article-001",
            image_url: "https://www.example.com/images/article1.html",
            insights: [
                {
                    sentiment: "positive",
                    sentiment_reasoning:
                        "Apple's revenue exceeded expectations, driving stock price up.",
                    ticker: "AAPL",
                },
            ],
            keywords: ["Apple", "Earnings", "Stock Market"],
            published_utc: "2024-01-29T14:30:00Z",
            publisher: {
                favicon_url: "https://www.example.com/favicon.ico",
                homepage_url: "https://www.example.com",
                logo_url: "https://www.example.com/logo.png",
                name: "Example News",
            },
            tickers: ["AAPL"],
            title: "Apple Stock Surges After Strong Earnings Report",
        },
        {
            amp_url: "https://www.example.com/article2/amp",
            article_url: "https://www.example.com/article4",
            author: "John Smith",
            description: "Tesla announces record-breaking delivery numbers for Q4 2023.",
            id: "article-002",
            image_url: "https://www.example.com/images/article4.jpg",
            insights: [
                {
                    sentiment: "positive",
                    sentiment_reasoning:
                        "Tesla's deliveries surpassed analysts' estimates, boosting investor confidence.",
                    ticker: "TSLA",
                },
            ],
            keywords: ["Tesla", "EV Market", "Stock Performance"],
            published_utc: "2024-01-29T12:00:00Z",
            publisher: {
                favicon_url: "https://www.example2.com/favicon.ico",
                homepage_url: "https://www.example2.com",
                logo_url: "https://www.example2.com/logo.png",
                name: "Market Watch",
            },
            tickers: ["TSLA"],
            title: "Tesla Reports Record-Breaking Q4 Deliveries",
        },
    ],
    status: "OK",
}

const polygonData: PolygonAggBars[] = [
    {
        ticker: "AAPL",
        resultsCount: 1,
        results: [
            {
                c: 110,
                o: 100,
                h: 0,
                l: 0,
                n: 0,
                t: 0,
                v: 0,
                vw: 0,
            },
        ],
        adjusted: false,
        next_url: "",
        queryCount: 0,
        request_id: "",
        status: "",
    },
    {
        ticker: "TSLA",
        resultsCount: 1,
        results: [
            {
                c: 110,
                o: 99,
                h: 0,
                l: 0,
                n: 0,
                t: 0,
                v: 0,
                vw: 0,
            },
        ],
        adjusted: false,
        next_url: "",
        queryCount: 0,
        request_id: "",
        status: "",
    },
]
