import { S3BucketInfo } from "../pseudo_aws/aws_sdk";
import config from "../config";

// this file isn't used anywhere meaningfully
// I made it in my attempt to get the files you sent to run
// before eventually reimplementing them

const aWSBucket: { [id: string]: S3BucketInfo } = {
    "development": {
        bucketName: "development",
        cfBaseURL: `http://localhost:${config.PORT}/img/`
    } as S3BucketInfo
}


// const customerio: { [id: string]: } = null;

export { aWSBucket }
