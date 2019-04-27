import { Tag } from "aws-sdk/clients/s3";

import { s3 } from "./aws-services";

export const syncToS3 = function(bucketName: string, folder: string) {};

export const doesS3BucketExists = async (bucketName: string) => {};

export const createBucket = async (bucketName: string) => {
  console.log(`[S3] Creating "${bucketName}" bucket...`);
  try {
    await s3
      .createBucket({
        Bucket: bucketName
      })
      .promise();
  } catch (error) {
    if (error.statusCode === 409) {
      throw new Error(
        "It seems that a bucket already exists but in an unsupported region... You should delete it first."
      );
    }
    throw error;
  }

  console.log(
    `[S3] Add tag "${identifyingTag.Key}:${identifyingTag.Value}"...`
  );
  await s3
    .putBucketTagging({
      Bucket: bucketName,
      Tagging: {
        TagSet: [identifyingTag]
      }
    })
    .promise();
};

export const setBucketWebsite = (bucketName: string) => {
  console.log(
    `[S3] Set bucket website with IndexDocument: "index.html" & ErrorDocument: "index.html"...`
  );
  return s3
    .putBucketWebsite({
      Bucket: bucketName,
      WebsiteConfiguration: {
        ErrorDocument: {
          Key: "index.html"
        },
        IndexDocument: {
          Suffix: "index.html"
        }
      }
    })
    .promise();
};

export const setBucketPolicy = (bucketName: string) => {
  console.log(`[S3] Allow public read...`);
  return s3
    .putBucketPolicy({
      Bucket: bucketName,
      Policy: JSON.stringify({
        Statement: [
          {
            Sid: "AllowPublicRead",
            Effect: "Allow",
            Principal: {
              AWS: "*"
            },
            Action: "s3:GetObject",
            Resource: `arn:aws:s3:::${bucketName}/*`
          }
        ]
      })
    })
    .promise();
};

export const identifyingTag: Tag = {
  Key: "created-by",
  Value: "aws-spa"
};