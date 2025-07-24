import { ResponseFormatJSONSchema } from "openai/resources/shared";

const TOP_N_ARTICLES = 5;

/**
 * formatting:
 *  1. `number` of articles (array length)
 *  2. `string` of formatted article contents
 *  3. `number` of articles (array length) (yes, again)
 */
const ANALYSIS_PROMPT = `
You are a financial analyst tasked with identifying the top ${TOP_N_ARTICLES} most impactful news stories from a collection of stock news.

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

Here are %d news stories to evaluate:

%s

Please identify the TOP ${TOP_N_ARTICLES} most impactful news stories from the above list, ranked by impact (1 being most impactful).

Respond with a JSON array of objects, each containing:
- storyNumber: the story number from the list (1-%d)
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

/**
 * format:
 *  1. article `number` starting at one
 *  2. `string` of symbol/ticker
 *  3. `string` of article title
 *  4. `string` of article summary
 *  5. `string` of article source site
 *  6. `string` of article publishing date
 *  7. `string` of article url
 */
const ARTICLE_TEMPLATE = `
%d. Symbol: %s
    Title: %s
    Summary: %s
    Source: %s
    Date: %s
    URL: %s
`;

const ANALYSIS_RESPONSE_SCHEMA: ResponseFormatJSONSchema.JSONSchema = {
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
                maxItems: TOP_N_ARTICLES,
            },
        },
        required: ["topStories"],
    },
};

const TOTAL_NEWS_CAP = 100;

export {ANALYSIS_PROMPT, ARTICLE_TEMPLATE, ANALYSIS_RESPONSE_SCHEMA, TOP_N_ARTICLES, TOTAL_NEWS_CAP};
