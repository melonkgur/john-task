import { ImageResult } from "../models/imageResult.model";
import tinify from "tinify";
import config from "../config";

class ImageService {
    constructor() {
        tinify.key = config.TINIFY_KEY
    }

    async optimizeImage(image: ImageResult): Promise<ImageResult> {
        if (!image.success) {
            console.error(`⚠️ optimizeImage recieved an image with an unsuccessful result.`);
            return {
                base64: "",
                success: false
            };
        }

        let base64;
        try {
            const unoptimized = Buffer.from(image.base64, 'base64');
            const buf = tinify.fromBuffer(unoptimized);

            const optimized = await buf.toBuffer();

            base64 = Buffer.from(optimized.buffer).toString('base64');
        } catch(err) {
            // if the image was successfully generated before,
            // just report the error and use the unoptimized one
            console.error(`⚠️ optimizeImage failed to run optimization:`, err);
            return image;
        }

        return {
            base64,
            success: true
        };
    }
}

const imageService = new ImageService();

export default imageService;
