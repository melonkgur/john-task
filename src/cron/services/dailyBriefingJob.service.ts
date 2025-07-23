import { S3 } from "../../pseudo_aws/aws_sdk";
import config from "../../config";
import { DailyBriefingModel, NewsItem } from "../../models/dailyBriefing.model"
// import financialModelingPrepService from "../../services/app/financialModelingPrep/financialModelingPrep.service"
import PolygonService from "../../services/appV2/polygon/polygonService"
import { aWSBucket, customerio } from "../../constants/app.constant"
import axios from "axios"
import { Readable } from "stream"
// import OpenAIService from "../../seavices/appV3/ai/openai.service"
// import CustomerIOService from "../../services/appV3/notifications/customerio.service"
// import DailyBriefingService from "../../services/webV2/dailyBriefing.service"
import { FMPETFHolding } from "../../services/app/financialModelingPrep/financialModelingPrepModels"

const INDEX_FUND = "IVV"
const POLYGON_REQ_CHUNK_SIZE = 50

const createStockList = async (holdings: FMPETFHolding[]) => {
    const stockData: Array<{ ticker: string; dayChangePercent: number; weight: number }> = []
    for (let i = 0; i < holdings.length; i += POLYGON_REQ_CHUNK_SIZE) {
        const chunk = holdings.slice(i, i + POLYGON_REQ_CHUNK_SIZE)
        const promises = chunk.map(async (holding) => PolygonService.getNDayAgg(holding.asset, 1))
        const pLData = await Promise.allSettled(promises)
        pLData.forEach((p) => {
            if (p.status === "fulfilled") {
                if (p.value.resultsCount <= 0) {
                    return
                }
                stockData.push({
                    ticker: p.value.ticker,
                    weight: holdings.find((h) => h.asset === p.value.ticker)?.weightPercentage || 0,
                    dayChangePercent:
                        ((p.value.results[0].c - p.value.results[0].o) / p.value.results[0].o) *
                        100,
                })
            }
        })
    }
    return stockData.sort((a, b) => b.weight - b.weight)
}

export const uploadImageToS3 = async (imageUrl: string) => {
    const s3 = new S3({
        accessKeyId: config.AWS_ACCESSKEY,
        secretAccessKey: config.AWS_SECRET,
    })

    const image = await axios.get(imageUrl, { responseType: "stream" })

    const name = `${Math.random().toString(36).substring(7)}.jpg`

    const awsParams = {
        Bucket: aWSBucket[config.NODE_ENV].bucketName,
        Key: `news/${name}`,
        Body: image.data as Readable,
    }
    try {
        await s3.upload(awsParams).promise()
        return `${aWSBucket[config.NODE_ENV].cfBaseURL}/news/${name}`
    } catch (e) {
        console.log(`Error uploading image to s3: ${e}`)
        return undefined
    }
}

const createDailyBriefingNotification = async (newsStories: NewsItem[]) => {
    const response = await OpenAIService.generateChatCompletion(
        `
        Generate a notification for a daily briefing sent to users. Each line should start with an emoji followed by a headline simplified to 12 words or less.
        Follow this EXACT format (no extra line breaks between headlines):
        💳 PayPal lays out strategy for Venmo to reach $2 billion in revenue in 2027
        💸 Anthropic closes in on $3.5 billion funding round as investor interest soars
        📈 S&P 500 hits record high as tech stocks rally because of AI

        Choose the top 3 stories from the most recognizable companies in the S&P 500:
        ${newsStories
            .map((n) => {
                return `${n.symbol}: ${n.text}`
            })
            .join(", ")}
    `,
        "gpt-4.1", // use heavyweight model for quality briefing, done once daily
        0.1
    )
    return response
}

export const isWeekend = (date: Date): boolean => {
    return date.getDay() === 0 || date.getDay() === 6
}

export const generateDailyBriefing = async () => {
    const startTime = Date.now()
    console.log("[GenerateDailyBriefing] Starting generateDailyBriefing...")

    const date = new Date()
    if (isWeekend(date)) {
        console.log("[GenerateDailyBriefing] Job not run on weekends.")
        return []
    }

    const holdings = await financialModelingPrepService.getEtfHoldingsStable(INDEX_FUND)
    console.log(`[GenerateDailyBriefing] Holdings fetched: ${holdings.length} for ${INDEX_FUND}`)

    if (!holdings || holdings.length === 0) {
        console.log(`[GenerateDailyBriefing] No holdings found for ${INDEX_FUND}`)
        return []
    }

    const sortedVolitilityList = await createStockList(holdings)
    console.log(
        `[GenerateDailyBriefing] Sorted volatility list created with ${sortedVolitilityList.length} items.`
    )

    const recentBriefings = await DailyBriefingModel.find().sort({ $natural: -1 }).limit(10)
    const recentArticles = new Set<string>()
    recentBriefings.forEach((briefing) => {
        briefing.news.forEach((article) => {
            recentArticles.add(article.url)
        })
    })

    let newsStories: NewsItem[] = []
    const newsStoriesSet = new Set<string>()
    while (newsStories.length < 7) {
        const company = sortedVolitilityList.shift()
        if (!company) {
            console.log("[GenerateDailyBriefing] No more companies to process.")
            break
        }
        const yesterday = new Date(new Date().setDate(new Date().getDate() - 1))
        yesterday.setHours(16, 0, 0, 0)
        console.log(
            `[GenerateDailyBriefing] Fetching news for company: ${company.ticker} on date: ${yesterday.toISOString()}`
        )

        const news = await PolygonService.getNews(company.ticker, yesterday, 10)
        let storyAdded = false
        for (const story of news.results) {
            if (!story.insights || !story.image_url) {
                continue
            }
            for (const insight of story.insights) {
                if (
                    insight.ticker === company.ticker &&
                    insight.sentiment_reasoning.split(" ").length > 7 &&
                    !newsStoriesSet.has(story.article_url) &&
                    ((company.dayChangePercent > 0 && insight.sentiment === "positive") ||
                        (company.dayChangePercent <= 0 && insight.sentiment === "negative")) &&
                    !story.image_url.includes(".html") &&
                    !recentArticles.has(story.article_url)
                ) {
                    console.log(
                        "[GenerateDailyBriefing] Found news story for company: ",
                        company.ticker
                    )
                    const imageUrl = await uploadImageToS3(story.image_url)
                    if (!imageUrl) {
                        console.log(
                            `[GenerateDailyBriefing] Image upload failed for story: ${story.article_url}`
                        )
                        continue
                    }
                    newsStories.push({
                        symbol: company.ticker,
                        text: story.title,
                        url: story.article_url,
                        change: company.dayChangePercent,
                        imageUrl: imageUrl,
                        etfInformation: {
                            etfTicker: INDEX_FUND,
                            etfWeight:
                                holdings.find((h) => h.asset === company.ticker)
                                    ?.weightPercentage || 0,
                        },
                        description: insight.sentiment_reasoning,
                    })
                    console.log(
                        `[GenerateDailyBriefing] Added news story for ${company.ticker}: ${insight.sentiment_reasoning}`
                    )
                    storyAdded = true
                    newsStoriesSet.add(story.article_url)
                    break
                }
            }
            if (storyAdded) {
                break
            }
        }
    }

    if (newsStories.length < 1) return []
    try {
        const notification = await createDailyBriefingNotification(newsStories)
        console.log(`[GenerateDailyBriefing] Notification generated: ${notification}`)
        await CustomerIOService.sendBroadcastTrigger(
            customerio.broadcastIds[config.NODE_ENV].dailyBriefing,
            {
                text: notification,
                dow: new Date().toLocaleDateString("en-US", { weekday: "long" }),
            }
        )
    } catch (error) {
        console.error(
            "[GenerateDailyBriefing] Failed to create daily briefing notification:",
            error
        )
    }

    const endTime = Date.now()
    console.log(
        `[GenerateDailyBriefing] generateDailyBriefing completed in ${endTime - startTime} ms with ${newsStories.length} stories fetched.`
    )
    await DailyBriefingService.createDailyBriefing({ news: newsStories })
    return newsStories
}
