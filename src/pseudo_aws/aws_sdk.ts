import { Readable } from "stream"

import fs from "fs/promises";

// this file isn't used anywhere meaningfully
// I made it in my attempt to get the files you sent to run
// before eventually reimplementing them

interface S3InitParams {
    accessKeyId: string,
    secretAccessKey: string
}

interface S3UploadParams {
    Bucket: string,
    Key: string,
    Body: Readable
}

interface S3BucketInfo {
    bucketName: string,
    cfBaseURL: string,
}

// really stupid hack to get `.promise()` to be valid.
class UploadWrapper {
    private wrapped: Promise<void>;

    constructor(wrapped: Promise<void>) {
        this.wrapped = wrapped;
    }

    promise(): Promise<void> {
        return this.wrapped;
    }
}

class S3 {
    constructor(params: S3InitParams) { }

    upload(params: S3UploadParams): UploadWrapper {
        return new UploadWrapper(fs.writeFile(`data/${params.Bucket}/${params.Key}`, params.Body));
    }
}

export { S3, S3InitParams, S3UploadParams, S3BucketInfo }
