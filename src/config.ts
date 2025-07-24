import dotenv from "dotenv"

dotenv.config();

interface Config {
    readonly PORT: number,
    readonly OPENAI_KEY: string,
    readonly NODE_ENV: string,
    readonly AWS_ACCESSKEY: string, // i would like to make it very cleary that i do not have access to this key
    readonly AWS_SECRET: string, // same with this one
    readonly FMP_KEY: string,
    readonly TINIFY_KEY: string
}

const config: Config = {
    PORT: Number(process.env.PORT) || 3000,
    OPENAI_KEY: process.env.OPENAI_KEY!,
    NODE_ENV: process.env.NODE_ENV || 'development',
    AWS_ACCESSKEY: process.env.AWS_ACCESSKEY || "", // the only reason that this key is here is to reduce errors
    AWS_SECRET: process.env.AWS_SECRET || "", // same with this one
    FMP_KEY: process.env.FMP_KEY!,
    TINIFY_KEY: process.env.TINIFY_KEY!
}

export default config;
