import axios from "axios";
import OpenAI from "openai";
import config from "../config";

// Types for our API responses
interface StockNews {
  symbol: string;
  publishedDate: string;
  title: string;
  image: string;
  site: string;
  text: string;
  url: string;
}

interface ETFHoldings {
  symbol: string;
  asset: string;
  name: string;
  isin: string;
  securityCusip: string;
  sharesNumber: number;
  weightPercentage: number;
  marketValue: number;
  updatedAt: string;
}

interface NewsAnalysis {
  symbol: string;
  title: string;
  impactScore: number;
  reasoning: string;
  url: string;
  image: string;
}

class NewsAnalyzer {
  private apiKey: string;
  private openai: OpenAI;

  constructor(apiKey: string, openaiApiKey: string) {
    this.apiKey = apiKey;
    this.openai = new OpenAI({ apiKey: openaiApiKey });
  }

  async getETFHoldings(etfSymbol: string): Promise<ETFHoldings[]> {
    try {
      const response = await axios.get(
        `https://financialmodelingprep.com/stable/etf/holdings?symbol=${etfSymbol}&apikey=${this.apiKey}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching ETF holdings:", error);
      throw error;
    }
  }

  async getStockNews(
    symbol: string,
    fromDate: string,
    toDate: string
  ): Promise<StockNews[]> {
    try {
      const response = await axios.get(
        `https://financialmodelingprep.com/api/v3/stock_news?tickers=${symbol}&page=1&from=${fromDate}&to=${toDate}&apikey=${this.apiKey}`
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching news for ${symbol}:`, error);
      return [];
    }
  }

  async analyzeNewsImpact(
    newsStories: StockNews[],
    topN: number
  ): Promise<NewsAnalysis[]> {
    if (newsStories.length === 0) {
      return [];
    }
    console.log(
      `Analyzing ${newsStories.length} news stories...finding the top ${topN} most impactful...`
    );
    try {
      const prompt = `
You are a financial analyst tasked with identifying the top ${topN} most impactful news stories from a collection of stock news.

IMPORTANT: Filter out promotional content, clickbait, and non-news items such as:
- "X Reasons to Buy [Stock]" articles
- "Why [Stock] is a Great Investment" pieces
- Generic stock recommendations
- Marketing content disguised as news
- Articles that are just opinions without actual news events

Focus only on REAL news events such as:
- Earnings announcements and financial results
- Merger and acquisition news
- Regulatory changes or legal developments
- Product launches or business developments
- Management changes
- Industry-specific events
- Market-moving announcements

Consider these factors when evaluating impact:
- Market sentiment impact (positive/negative)
- Potential price movement magnitude
- Industry-wide implications
- Regulatory or policy changes
- Competitive landscape changes
- Timeliness and relevance
- Source credibility

Here are ${newsStories.length} news stories to evaluate:

${newsStories
  .map(
    (story, index) => `
${index + 1}. Symbol: ${story.symbol}
   Title: ${story.title}
   Summary: ${story.text}
   Source: ${story.site}
   Date: ${story.publishedDate}
   URL: ${story.url}
`
  )
  .join("\n")}

Please identify the TOP ${topN} most impactful news stories from the above list, ranked by impact (1 being most impactful).

Respond with a JSON array of objects, each containing:
- storyNumber: the story number from the list (1-${newsStories.length})
- title: a short, high-level title (3-7 words) that captures the key point
- reasoning: brief reasoning in simple, easy-to-understand language (15-20 words max)
- impactScore: a score from 1-10 indicating relative impact level

Format:
[
  {
    "storyNumber": number,
    "title": "string",
    "reasoning": "string",
    "impactScore": number
  },
  ...
]
`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "news_analysis",
            schema: {
              type: "object",
              properties: {
                topStories: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      storyNumber: { type: "number" },
                      title: { type: "string" },
                      reasoning: { type: "string" },
                      impactScore: { type: "number" },
                    },
                    required: [
                      "storyNumber",
                      "title",
                      "reasoning",
                      "impactScore",
                    ],
                  },
                  minItems: 1,
                  maxItems: topN,
                },
              },
              required: ["topStories"],
            },
          },
        },
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        throw new Error("No response from OpenAI");
      }
      console.log("Analysis result:", response);

      let analysis;
      try {
        analysis = JSON.parse(response);
      } catch (parseError) {
        console.error("Failed to parse JSON response:", parseError);
        console.error("Raw response:", response);
        throw new Error("Invalid JSON response from OpenAI");
      }

      // Extract the topStories array from the response object
      if (!analysis.topStories || !Array.isArray(analysis.topStories)) {
        console.error("Expected topStories array but got:", analysis);
        throw new Error("Response does not contain topStories array");
      }

      // Convert the analysis to NewsAnalysis objects
      const topStories: NewsAnalysis[] = analysis.topStories.map(
        (item: any) => {
          const selectedStory = newsStories[item.storyNumber - 1];
          return {
            symbol: selectedStory.symbol,
            title: item.title, // Use the AI-generated short title
            impactScore: item.impactScore,
            reasoning: item.reasoning,
            url: selectedStory.url,
            image: selectedStory.image, // Include the image URL
          };
        }
      );

      return topStories;
    } catch (error) {
      console.error("Error analyzing news stories:", error);
      return [];
    }
  }

  async findMostImpactfulNews(
    etfSymbol: string = "IVV",
    fromDate: string,
    toDate: string,
    topN: number
  ): Promise<NewsAnalysis[]> {
    console.log(`Fetching holdings for ${etfSymbol}...`);

    // Get ETF holdings
    const holdings = await this.getETFHoldings(etfSymbol);
    console.log(`Found ${holdings.length} holdings in ${etfSymbol}`);

    // Get news for each stock until we reach 100 stories total
    const allNews: StockNews[] = [];
    let stockIndex = 0;

    while (allNews.length < 100 && stockIndex < holdings.length) {
      const holding = holdings[stockIndex];
      console.log(`Fetching news for ${holding.asset} (${holding.name})...`);
      const news = await this.getStockNews(holding.asset, fromDate, toDate);

      if (news.length > 0) {
        // Take all available news stories for this stock
        const stockNews = news.slice(0, 5); // Still limit per stock to avoid overwhelming
        allNews.push(...stockNews);
        console.log(
          `  - Found ${stockNews.length} news stories (Total: ${allNews.length})`
        );
        stockNews.forEach((story, index) => {
          console.log(`    ${index + 1}. "${story.title}"`);
        });
      } else {
        console.log(`  - No news found`);
      }

      stockIndex++;
      // Add a small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(
      `\nProcessed ${stockIndex} stocks to collect ${allNews.length} news stories`
    );

    if (allNews.length === 0) {
      console.log("No news stories found for any holdings");
      return [];
    }

    console.log(
      `\nAnalyzing ${allNews.length} total news stories with OpenAI to find the top ${topN}...`
    );

    // Analyze all news stories to find the top 7
    const topStories = await this.analyzeNewsImpact(allNews, topN);

    return topStories;
  }
}

// Main execution function
async function main() {
  // API keys - replace with your actual keys
  const financialModelingPrepApiKey = config.FMP_KEY;
  const openaiApiKey = config.OPENAI_KEY; 

  if (!openaiApiKey) {
    console.error(
      "Please replace the openaiApiKey variable with your actual OpenAI API key"
    );
    process.exit(1);
  }

  const analyzer = new NewsAnalyzer(financialModelingPrepApiKey, openaiApiKey);

  // Set date range for news (last 3 days)
  const toDate = new Date().toISOString().split("T")[0];
  const fromDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  try {
    const topStories = await analyzer.findMostImpactfulNews(
      "IVV",
      fromDate,
      toDate,
      20
    );

    if (topStories.length > 0) {
      console.log("\n🎯 TOP 7 MOST IMPACTFUL NEWS STORIES:");
      console.log("=====================================");

      topStories.forEach((story, index) => {
        console.log(`\n${index + 1}. Symbol: ${story.symbol}`);
        console.log(`   Title: ${story.title}`);
        console.log(`   Impact Score: ${story.impactScore}/10`);
        console.log(`   Reasoning: ${story.reasoning}`);
        console.log(`   URL: ${story.url}`);
        console.log(`   Image: ${story.image}`);
      });
    } else {
      console.log("No news stories found");
    }
  } catch (error) {
    console.error("Error in main execution:", error);
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}

export { NewsAnalyzer, StockNews, ETFHoldings, NewsAnalysis };

