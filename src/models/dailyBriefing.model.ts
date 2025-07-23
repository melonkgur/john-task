import { AnalyzedArticle } from "./article.model"
import { CompanyProfile } from "./financialModelingPrep.model"
import { ImageResult } from "./imageResult.model"

enum PromptCategory {
    Office = "office",
    Thing = "thing"
}

interface EnrichedArticle extends AnalyzedArticle {
    companyProfile: CompanyProfile,
    thing: string,
    category: PromptCategory,
    imageResult: ImageResult
}

interface DailyBrief {
    uuid: string,
    symbol: string,
    companyName: string,
    icon?: string|undefined,
    title: string,
    text: string,
    publishedDate: string,
    inlineImage?: string|null,
    site: string,
    url: string
}

export {PromptCategory, EnrichedArticle, DailyBrief}
