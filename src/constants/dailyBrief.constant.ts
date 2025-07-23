/**
 * formatting:
 *  1. headline/title
 */
const GET_SUBJECT_PROMPT = `You are given ONE news headline about a public company.
1. Identify a concrete, tangible product, service, asset or physical location that is CENTRAL to the headline.
    • Examples: "electric cars", "iPhone", "oil refinery", "theme park".
2. If the headline is about INTANGIBLE topics such as earnings, profits, guidance, lawsuits, stock price, dividends, market sentiment, leadership changes, etc. — or if no concrete product/location is mentioned — respond with just the word "NOTHING".
3. Otherwise, respond with EXACTLY one short noun phrase (1–3 words).
4. Respond with NO extra words, no quotes, no punctuation.

Headline: "%s"
Thing: `;

/**
 * formatting:
 *  1. company name (or, as a fallback, ticker/symbol)
 *  2. product
 */
const COMPANY_PRODUCT_ASSOCIATION_PROMPT = `Answer with only "YES" or "NO" (no punctuation).
Question: Does the company %s directly manufacture, sell, or provide %s?
Answer: `;

/**
 * formatting:
 *  1. company name
 */
const GEN_OFFICE_PROMPT = `Create a high-quality, photo-realistic image showing the headquarters or office (interior or exterior) of %s. It should look like a genuine photograph suitable for a news article.`;

/**
 * formatting:
 *  1. product name
 *  2. company name
 */
const GEN_BRANDED_PRODUCT_PROMPT = `Create a high-quality, photo-realistic stock photo of %s produced or branded by %s. The scene should look authentic and news-worthy.`;

/**
 * format:
 *  1. product/subject name
 */
const GEN_SUBJECT_PROMPT = `Create a high-quality, photo-realistic stock photo of %s. Do NOT include any company logos or references.`;


// only reason that this is here is because it's related to the cron job
// and referenced in the database brief-pruning step
const MILLISECONDS_PER_DAY = 1000*60*60*24;

const ETF_SYMBOL = "IVV";

export {GET_SUBJECT_PROMPT, COMPANY_PRODUCT_ASSOCIATION_PROMPT, MILLISECONDS_PER_DAY, ETF_SYMBOL, GEN_OFFICE_PROMPT, GEN_SUBJECT_PROMPT, GEN_BRANDED_PRODUCT_PROMPT};
