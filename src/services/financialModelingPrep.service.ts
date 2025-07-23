import config from "../config";
import { ANALYSIS_PROMPT, ANALYSIS_RESPONSE_SCHEMA, ARTICLE_TEMPLATE, TOP_N_ARTICLES, TOTAL_NEWS_CAP } from "../constants/financialModelingPrep.constant";
import { AnalyzedArticle, Article } from "../models/article.model";
import { ArticleAnalysis, CompanyProfile, ETFHoldings } from "../models/financialModelingPrep.model";
import axios from "axios";
import util from "util";
import aiService from "./openAI.service";

namespace fmp_service {
    /**
     * Retrieves the FMP profile for a given company.
     *
     * @param symbol symbol/ticker of the desired company
     *
     * @returns The profile of the company. It is guaranteed that `companyName` and `symbol` will be valid.
     */
    export async function getCompanyProfileBySymbol(
        symbol: string
    ): Promise<CompanyProfile> {
        try {
            const url = `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${config.FMP_KEY}`;
            const {data} = await axios.get(url);
            if (Array.isArray(data) && data.length) {
                let profile: CompanyProfile = {
                    ...data[0]
                };

                profile.companyName ??= symbol;
                profile.symbol ??= symbol;

                return profile;
            }
        } catch (err) {
            console.error(`⚠️ getCompanyProfileBySymbol failed for symbol "${symbol}":`, err);
        }

        return {
            symbol,
            companyName: symbol
        };
    }

    /**
     * Retrieves ETF holdings from FMP based on the fund's symbol.
     *
     * @param etfSymbol symbol/ticker of the desired fund
     *
     * @returns An array containing all holdings for the desired fund.
     */
    export async function getETFHoldings(etfSymbol: string): Promise<ETFHoldings[]> {
        try {
            const response = await axios.get(
                `https://financialmodelingprep.com/stable/etf/holdings?symbol=${etfSymbol}&apikey=${config.FMP_KEY}`
            );

            if (response.data && !response.data.length)
                return response.data as ETFHoldings[];
            else {
                console.error(`⚠️ getETFHoldings recieved empty array or null for symbol "${etfSymbol}".`);
                return [];
            }
        } catch(err) {
            console.error(`⚠️ getETFHoldings failed for symbol "${etfSymbol}":`, err);
            return [];
        }
    }

    async function getStockNews(
        symbol: string,
        fromDate: string,
        toDate: string
    ): Promise<Article[]> {
        try {
            const response = await axios.get(
               `https://financialmodelingprep.com/api/v3/stock_news?tickers=${symbol}&page=1&from=${fromDate}&to=${toDate}&apikey=${config.FMP_KEY}`
            );

            if (response.data && !response.data.length)
                return response.data as Article[];
            else {
                console.error(`⚠️ getStockNews recieved empty array or null for symbol "${symbol}" between dates "${fromDate}" to "${toDate}.`);
                return [];
            }
        } catch(err) {
            console.error(`⚠️ getStockNews failed for symbol "${symbol}" between dates "${fromDate}" to "${toDate}":`, err);
            return [];
        }
    }

    /**
     * Analyzes a list of articles and finds the top *n* (dictated by the `TOP_N_ARTICLES` constant) most significant among them.
     *
     * @param articles List of articles to analyze.
     *
     * @returns A list of *n* (analyzed) articles or less.
     */
    async function analyzeArticles(
        articles: Article[]
    ): Promise<AnalyzedArticle[]> {
        if (articles.length === 0) {
            console.error(`⚠️ analyzeArticles was passed an empty array.`);
            return [];
        }

        // mash all of the articles into one (formatted) wall of text
        const formattedArticleInfo = articles.map(
            (article, i) => util.format(
                ARTICLE_TEMPLATE,
                i + 1,
                article.symbol,
                article.title,
                article.text,
                article.site,
                article.publishedDate,
                article.url
            )
        ).join('\n');

        try {
            const prompt = util.format(
                ANALYSIS_PROMPT,
                articles.length,
                formattedArticleInfo,
                articles.length
            );

            let analysis = await aiService.schemaCompletion<ArticleAnalysis>(
                prompt,
                ANALYSIS_RESPONSE_SCHEMA
            );

            if (!analysis || !analysis.topStories || !Array.isArray(analysis.topStories)) {
                console.error("⚠️ analyzeArticles recieved an empty or invalid list of top stories from OpenAI.");

                return [];
            }

            const topStories: AnalyzedArticle[] = analysis.topStories.map(
                (item: any) => {
                    const article = articles[item.storyNumber - 1];
                    return {
                        ...article,
                        title: item.title, // use generated short-title instead
                        impactScore: item.impactScore,
                        reasoning: item.reasoning
                    };
                }
            );

            // just in case
            if (topStories.length > TOP_N_ARTICLES) {
                return topStories.slice(0, TOP_N_ARTICLES);
            }

            return topStories;
        } catch (err) {
            console.error("⚠️ analyzeArticles failed:", err);

            return [];
        }
    }


    /**
     * Finds and analyzes the most impactful news about stocks in a given fund.
     *
     * @param etfSymbol Fund symbol
     * @param fromDate Oldest date allowed when filtering
     * @param toDate Newest date allowed when filtering
     *
     * @returns A list of the top *n* (dictated by the `TOP_N_ARTICLES` constant) articles pertaning to the fund.
     */
    export async function findMostImpactfulNews(
        etfSymbol: string,
        fromDate: string,
        toDate: string,
    ): Promise<AnalyzedArticle[]> {
        const holdings = await getETFHoldings(etfSymbol);

        const allNews: Article[] = [];

        for(let i = 0; allNews.length < TOTAL_NEWS_CAP && i < holdings.length; i++) {
            const holding = holdings[i];
            const news = await getStockNews(holding.asset, fromDate, toDate);

            if (news.length > 0) {
                const articles = news.slice(0, Math.min(5, news.length));
                allNews.push(...articles);
            }

            // Add a small delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        if (allNews.length === 0) {
            console.error("⚠️ findMostImpactfulNews couldn't find news for any holdings.");

            return [];
        }

        const topStories = await analyzeArticles(allNews);

        return topStories;
    }
}

export=fmp_service;
