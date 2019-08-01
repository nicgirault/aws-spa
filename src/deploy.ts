import { existsSync } from "fs";
import {
  doesS3BucketExists,
  createBucket,
  syncToS3,
  setBucketWebsite,
  setBucketPolicy,
  confirmBucketManagement,
  tagBucket
} from "./s3";
import { getCertificateARN, createCertificate } from "./acm";
import {
  findDeployedCloudfrontDistribution,
  createCloudFrontDistribution,
  invalidateCloudfrontCache,
  DistributionIdentificationDetail
} from "./cloudfront";
import {
  findHostedZone,
  createHostedZone,
  updateRecord,
  needsUpdateRecord
} from "./route53";
import { logger } from "./logger";

export const deploy = async (url: string, folder: string, wait: boolean) => {
  const [domainName, s3Folder] = url.split("/");

  logger.info(
    `✨ Deploying "${folder}" on "${domainName}" with path "${s3Folder ||
      "/"}"...`
  );

  if (!existsSync(folder)) {
    throw new Error(`folder "${folder}" not found`);
  }
  if (!existsSync(`${folder}/index.html`)) {
    throw new Error(`"index.html" not found in "${folder}" folder`);
  }
  if (!existsSync(`${folder}/static`)) {
    logger.warn(
      `folder "${folder}/static" does not exists. Only files in this folder are assumed to have a hash as explained in https://facebook.github.io/create-react-app/docs/production-build#static-file-caching and will be aggressively cached`
    );
  }

  if (await doesS3BucketExists(domainName)) {
    await confirmBucketManagement(domainName);
  } else {
    await createBucket(domainName);
  }
  await tagBucket(domainName);
  await setBucketWebsite(domainName);
  await setBucketPolicy(domainName);

  let hostedZone = await findHostedZone(domainName);
  if (!hostedZone) {
    hostedZone = await createHostedZone(domainName);
  }

  let certificateArn = await getCertificateARN(domainName);
  if (!certificateArn) {
    certificateArn = await createCertificate(domainName, hostedZone.Id);
  }

  let distribution: DistributionIdentificationDetail | null = await findDeployedCloudfrontDistribution(
    domainName
  );
  if (!distribution) {
    distribution = await createCloudFrontDistribution(
      domainName,
      certificateArn
    );
  }

  if (
    await needsUpdateRecord(hostedZone.Id, domainName, distribution.DomainName)
  ) {
    await updateRecord(hostedZone.Id, domainName, distribution.DomainName);
  }

  await syncToS3(folder, domainName, s3Folder);
  await invalidateCloudfrontCache(distribution.Id, wait);
};
