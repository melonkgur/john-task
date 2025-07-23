import { NewsAnalyzer, NewsAnalysis } from "./news";
import { CompanyAestheticImageGenerator, ImageResult } from "./imageGenerator";

import axios from "axios";
import OpenAI from "openai";
import config from "../config";

// ------------------  Types  ------------------

type PromptCategory = "office" | "thing";

interface EnrichedNewsItem extends NewsAnalysis {
  companyName: string;
  thing: string;
  category: PromptCategory;
  imageResult?: ImageResult;
}

// ------------------  Helpers  ------------------

/**
 * Fetch company profile ➜ companyName.
 */
async function getCompanyProfile(
  symbol: string,
  apiKey: string
): Promise<{ companyName: string }> {
  try {
    const url = `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${apiKey}`;
    const { data } = await axios.get(url);
    if (Array.isArray(data) && data.length) {
      const profile = data[0];
      return {
        companyName: profile.companyName ?? symbol,
      };
    }
  } catch (err) {
    console.error(`⚠️  Could not fetch profile for ${symbol}`, err);
  }
  return { companyName: symbol };
}

/**
 * Ask OpenAI for the main “thing” (noun phrase) in a headline.
 */
async function extractThing(openai: OpenAI, title: string): Promise<string> {
  const prompt = `You are given ONE news headline about a public company.\n1. Identify a concrete, tangible product, service, asset or physical location that is CENTRAL to the headline.\n   • Examples: "electric cars", "iPhone", "oil refinery", "theme park".\n2. If the headline is about INTANGIBLE topics such as earnings, profits, guidance, lawsuits, stock price, dividends, market sentiment, leadership changes, etc. — or if no concrete product/location is mentioned — respond with just the word "NOTHING".\n3. Otherwise, respond with EXACTLY one short noun phrase (1–3 words).\n4. Respond with NO extra words, no quotes, no punctuation.\n\nHeadline: \"${title}\"\nThing:`;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    });
    return completion.choices[0].message.content?.trim() ?? "NOTHING";
  } catch (err) {
    console.error("⚠️  extractThing failed:", err);
    return "";
  }
}

function randomCategory(): PromptCategory {
  const all: PromptCategory[] = ["office", "thing"];
  return all[Math.floor(Math.random() * all.length)];
}

/**
 * Enrich raw news stories with companyName, thing, and chosen category.
 */
async function enrichNews(
  stories: NewsAnalysis[],
  fmpKey: string,
  openai: OpenAI
): Promise<EnrichedNewsItem[]> {
  return Promise.all(
    stories.map(async (story) => {
      const { companyName } = await getCompanyProfile(story.symbol, fmpKey);
      const thing = await extractThing(openai, story.title);

      // pick category, fall back to "office" if no usable thing
      let category: PromptCategory = "thing";
      if (
        category === "thing" &&
        (!thing || thing.toUpperCase() === "NOTHING")
      ) {
        category = "office";
      }

      return {
        ...story,
        companyName,
        thing,
        category,
      };
    })
  );
}

/**
 * Decide whether the thing should be branded with the company.
 * Returns true if the company is widely known to MAKE/SELL that thing.
 */
async function companyMakesThing(
  openai: OpenAI,
  companyName: string,
  thing: string
): Promise<boolean> {
  // Fast heuristic via a tiny OpenAI call
  const prompt = `Answer with only "YES" or "NO" (no punctuation).\nQuestion: Does the company ${companyName} directly manufacture, sell, or provide ${thing}?`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    });
    const answer = completion.choices[0].message.content?.trim().toUpperCase();
    return answer === "YES";
  } catch (err) {
    console.error("⚠️  companyMakesThing check failed:", err);
    return false; // default to generic
  }
}

/**
 * Build the appropriate prompt and generate an image for each story.
 */
async function generateImages(
  generator: CompanyAestheticImageGenerator,
  items: EnrichedNewsItem[]
): Promise<EnrichedNewsItem[]> {
  const results = await Promise.all(
    items.map(async (item) => {
      let prompt: string;
      switch (item.category) {
        case "office":
          prompt = `Create a high-quality, photo-realistic image showing the headquarters or office (interior or exterior) of ${item.companyName}. It should look like a genuine photograph suitable for a news article.`;
          break;
        case "thing": {
          const openaiLocal = new OpenAI({
            apiKey: generator["openai"]["apiKey"] as string,
          });
          const branded = await companyMakesThing(
            openaiLocal,
            item.companyName,
            item.thing
          );

          if (branded) {
            prompt = `Create a high-quality, photo-realistic stock photo of ${item.thing} produced or branded by ${item.companyName}. The scene should look authentic and news-worthy.`;
          } else {
            prompt = `Create a high-quality, photo-realistic stock photo of ${item.thing}. Do NOT include any company logos or references.`;
          }
          break;
        }
      }

      try {
        const img = await generator.generateImage(prompt, item.companyName);
        return { ...item, imageResult: img };
      } catch (err) {
        console.error(
          `⚠️  Image generation failed for ${item.companyName}`,
          err
        );
        return item; // without image
      }
    })
  );
  return results;
}

// ------------------  Configuration ------------------

// How many top news stories to retrieve and ultimately generate content for.
const NUM_TOP_STORIES = 50; // <-- adjust this value as desired

// ------------------  Orchestration  ------------------

async function main() {
  // 👉  Replace the placeholders below with your real keys
  const FMP_KEY = config.FMP_KEY;
  const OPENAI_KEY = config.OPENAI_KEY

  if (!FMP_KEY || !OPENAI_KEY) {
    console.error(
      "❌ Please set FMP_KEY and OPENAI_KEY in completeNewsGeneration.ts"
    );
    process.exit(1);
  }

  // --- 1. Get top news  ----------------------------------------------------
  const analyzer = new NewsAnalyzer(FMP_KEY, OPENAI_KEY);
  const toDate = new Date().toISOString().split("T")[0];
  const fromDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const topNews = await analyzer.findMostImpactfulNews(
    "IVV",
    fromDate,
    toDate,
    NUM_TOP_STORIES
  );
  if (!topNews.length) {
    console.log("No impactful news found");
    return;
  }

  // --- 2. Enrich stories ---------------------------------------------------
  const openai = new OpenAI({ apiKey: OPENAI_KEY });
  const enriched = await enrichNews(topNews, FMP_KEY, openai);

  // --- 3. Generate images --------------------------------------------------
  const generator = new CompanyAestheticImageGenerator(OPENAI_KEY);
  const finalStories = await generateImages(generator, enriched);

  // --- 4. Output -----------------------------------------------------------
  console.log(
    `\n================  TOP ${NUM_TOP_STORIES} NEWS RESULTS  ================`
  );
  finalStories.forEach((s, i) => {
    console.log(`\n${i + 1}. ${s.symbol} — ${s.title}`);
    console.log(`   Thing    : ${s.thing}`);
    console.log(`   Category : ${s.category}`);
    console.log(`   Image    : ${s.imageResult?.filePath ?? "N/A"}`);
    console.log(`   URL      : ${s.url}`);
  });
}

// run when called directly
if (require.main === module) {
  main();
}

export { main, EnrichedNewsItem };
