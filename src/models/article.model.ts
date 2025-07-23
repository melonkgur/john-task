interface Article {
    symbol: string,
    publishedDate: string, // change to Date?
    title: string,
    image: string,
    site: string,
    text: string,
    url: string
}

interface AnalyzedArticle extends Article {
    impactScore: number,
    reasoning: string,
}

export {Article, AnalyzedArticle};
