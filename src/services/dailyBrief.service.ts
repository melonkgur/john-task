import { GET_SUBJECT_PROMPT, COMPANY_PRODUCT_ASSOCIATION_PROMPT, GEN_OFFICE_PROMPT, GEN_BRANDED_PRODUCT_PROMPT, GEN_SUBJECT_PROMPT } from "../constants/dailyBrief.constant";
import { DailyBrief, EnrichedArticle, PromptCategory } from "../models/dailyBriefing.model";
import util from "util"
import { AnalyzedArticle } from "../models/article.model";
import fmpService from "./financialModelingPrep.service";
import imageService from "./image.service";
import { randomUUID } from "crypto";
import aiService from "./openAI.service";
import { ImageResult } from "../models/imageResult.model";

namespace daily_brief_service {
    /**
     * Strips out unnecessary information related to daily brief articles.
     *
     * @param enriched Articles with attacthed images and company information
     *
     * @returns A list of only the necessary information from each article.
     */
    export function finalizeArticles(enriched: EnrichedArticle[]): DailyBrief[] {
        return enriched.map((article, i) => {
            return {
                uuid: randomUUID(),
                symbol: article.symbol,
                companyName: article.companyProfile.companyName ?? article.symbol,
                icon: article.companyProfile.image,
                title: article.title,
                text: article.text,
                publishedDate: article.publishedDate,
                inlineImage: (article.imageResult.success) ? article.imageResult.base64 : null,
                site: article.site,
                url: article.url
            };
        })
    }

    async function genArticleImage(
        companyName: string,
        imageCategory: PromptCategory,
        productOrSubject: string
    ): Promise<ImageResult> {
        let prompt: string;
        switch (imageCategory) {
            case PromptCategory.Office:
                prompt = util.format(GEN_OFFICE_PROMPT, companyName);
                break;

            case PromptCategory.Thing:
                const shouldBeBranded = await isCompanyAssociatedWithProduct(companyName, productOrSubject);

                if (shouldBeBranded) {
                    prompt = util.format(GEN_BRANDED_PRODUCT_PROMPT, productOrSubject, companyName);
                } else {
                    prompt = util.format(GEN_SUBJECT_PROMPT, productOrSubject);
                }

                break;
        }


        const img = await aiService.portraitImage(prompt);

        return await imageService.optimizeImage(img);
    }

    async function getArticleSubject(title: string): Promise<string> {
        const prompt = util.format(GET_SUBJECT_PROMPT, title);

        return await aiService.chatCompletion(
            prompt,
            0,
            "NOTHING"
        );
    }

    /**
     * Uses *AI* to determine whether a company "directly manufactures, sells, or provides" a product.
     *
     * @param companyName Company to check "association"
     * @param product Product that may or may not be associated with the company
     *
     * @returns Whether or not the given company "directly manufactures, sells, or provides" the given product.
     */
    export async function isCompanyAssociatedWithProduct(
        companyName: string,
        product: string
    ): Promise<boolean> {
        const prompt = util.format(COMPANY_PRODUCT_ASSOCIATION_PROMPT, companyName, product);

        const completion = await aiService.chatCompletion(
            prompt,
            0,
            "NO"
        );

        return completion.toUpperCase() == "YES";
    }

    function getRandomPromptCategory(): PromptCategory {
        const all: PromptCategory[] = Object.values(PromptCategory);
        return all[Math.floor(Math.random() * all.length)];
    }

    /**
     * Takes a list of articles and ai-generates stock photos to accompany them.
     *
     * @param articles List of articles to generate images for
     *
     * @returns List of articles with image data and associated company profiles.
     */
    export async function enrichArticles(
        articles: AnalyzedArticle[]
    ): Promise<EnrichedArticle[]> {
        return Promise.all(
            articles.map(async (article) => {
                const companyProfile = await fmpService.getCompanyProfileBySymbol(article.symbol);
                const thing = await getArticleSubject(article.title);

                let category: PromptCategory;
                if (thing === "NOTHING") {
                    category = PromptCategory.Office;
                } else {
                    category = getRandomPromptCategory();
                }

                const imageResult = await genArticleImage(
                    companyProfile.companyName!,
                    category,
                    thing
                );

                return {
                    ...article,
                    companyProfile,
                    thing,
                    category,
                    imageResult
                } as EnrichedArticle;
            })
        );
    }
}

export=daily_brief_service;
