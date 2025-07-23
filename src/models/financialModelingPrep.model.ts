// ref: https://site.financialmodelingprep.com/developer/docs/stable#profile-symbol
interface CompanyProfile {
    symbol?: string,
    price?: number,
    marketCap?: number,
    beta?: number,
    lastDividend?: number,
    range?: string,
    change?: number,
    changePercentage?: number,
    volume?: number,
    averageVolume?: number,
    companyName?: string,
    currency?: string,
    cik?: string,
    isin?: string,
    cusip?: string,
    exchangeFullName?: string,
    exchange?: string,
    industry?: string,
    website?: string,
    description?: string,
    ceo?: string,
    sector?: string,
    country?: string,
    fullTimeEmployees?: string,
    phone?: string,
    adress?: string,
    city?: string,
    state?: string,
    zip?: string,
    image?: string,
    ipoDate?: string,
    defaultImage?: boolean,
    isEtf?: boolean,
    isActivelyTrading?: boolean,
    isAdr?: boolean,
    isFund?: boolean
}

interface ETFHoldings {
    symbol: string,
    asset: string,
    name: string,
    isin: string,
    securityCusip: string,
    sharesNumber: number,
    weightPercentage: number,
    marketValue: number,
    updatedAt: string
}

interface ArticleAnalysis {
    topStories: {
        storyNumber: number,
        title: string,
        reasoning: string,
        impactScore: number
    }[]
}

export {CompanyProfile, ETFHoldings, ArticleAnalysis};
