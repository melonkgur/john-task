import OpenAI from "openai";
import { ResponseFormatJSONSchema } from "openai/resources/shared";
import { ImageResult } from "../models/imageResult.model";
import config from "../config";

// this really should've been a class
namespace openai_service {
    export const openai = new OpenAI({ apiKey: config.OPENAI_KEY });
}

class OpenaiService {
    private openai: OpenAI;

    constructor(apiKey?: string) {
        this.openai = new OpenAI({ apiKey: apiKey ?? config.OPENAI_KEY });
    }

    async chatCompletion(
        prompt:string,
        temperature: number = 0.3,
        defaultValue: string = ""
    ): Promise<string> {
        try {
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{role: "user", content: prompt}],
                temperature
            });

            return (completion.choices[0].message.content ?? defaultValue).trim();
        } catch (err) {
            console.error(`⚠️ OpenaiService::chatCompletion failed:`, err);

            return defaultValue;
        }
    }

    async schemaCompletion<T>(
        prompt: string,
        json_schema: ResponseFormatJSONSchema.JSONSchema,
        temperature: number = 0.3
    ): Promise<T|null> {
        let completion;
        try {
            completion = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{role: "user", content: prompt}],
                temperature,
                response_format: {
                    type: "json_schema",
                    json_schema
                }
            });
        } catch(err) {
            console.error("⚠️ OpenaiService::schemCompletion openai call failed:", err);

            return null;
        }

        const response = completion.choices[0].message.content;
        if (!response) {
            console.error("⚠️ OpenaiService::schemaCompletion recieved an empty response from OpenAI.");

            return null;
        }

        let parsed;
        try {
            parsed = JSON.parse(response);
        } catch(parseErr) {
            console.error("⚠️ OpenaiService::schemaCompletion recieved an invalid JSON response:", parseErr);
            console.error("\t" + response.replace("\n", "\n\t"));

            return null;
        }

        return parsed as T;
    }

    async portraitImage(
        prompt: string,
        n: number = 1
    ): Promise<ImageResult> {
        try {
            const img = await this.openai.images.generate({
                model: "gpt-image-1",
                prompt,
                output_format: "png",
                background: "opaque",
                size: "1024x1536",
                quality: "low",
                n
            });

            if (img.data && img.data.length && img.data[0].b64_json) {
                return {
                    base64: img.data[0].b64_json,
                    success: true
                };
            } else {
                return {
                    base64: "",
                    success: false
                };
            }
        } catch(err) {
            console.error("⚠️ OpenaiService::portraitImage openai call failed:", err);

            return {
                base64: "",
                success: false
            };
        }
    }
}

const aiService = new OpenaiService();

export default aiService;
