import * as dotenv from "dotenv";
dotenv.config();

import {
  BlobServiceClient,
  StorageSharedKeyCredential as BlobStorageSharedKeyCredential,
} from "@azure/storage-blob";

import {
  ShareServiceClient,
  StorageSharedKeyCredential as FileStorageSharedKeyCredential,
} from "@azure/storage-file-share";

import {
  QueueServiceClient,
  StorageSharedKeyCredential as QueueStorageSharedKeyCredential,
} from "@azure/storage-queue";

async function setCors(
  serviceClient: BlobServiceClient | ShareServiceClient | QueueServiceClient
) {
  const serviceProperties = await serviceClient.getProperties();
  if (serviceProperties.cors) {
    console.log("original cors:");
    console.log(serviceProperties.cors);
    // return;
  }

  const newCORS = {
    allowedHeaders: "*",
    allowedMethods: "DELETE,GET,HEAD,MERGE,POST,OPTIONS,PUT,PATCH",
    allowedOrigins: "*",
    exposedHeaders: "*",
    maxAgeInSeconds: 86400,
  };
  serviceProperties.cors = [...serviceProperties.cors, newCORS];
  await serviceClient.setProperties(serviceProperties as any);

  const newServiceProperties = await serviceClient.getProperties();
  console.log("new cors:");
  console.log(newServiceProperties.cors);
}

async function main() {
  const account = process.env.ACCOUNT_NAME || "";
  const accountKey = process.env.ACCOUNT_KEY || "";
  console.log("using account:", account, accountKey);

  console.log("Setting CORS for Blob service.");
  const blobSharedKeyCredential = new BlobStorageSharedKeyCredential(
    account,
    accountKey
  );
  const blobServiceClient = new BlobServiceClient(
    `https://${account}.blob.core.windows.net`,
    blobSharedKeyCredential
  );
  await setCors(blobServiceClient);

  console.log("Setting CORS for File service.");
  const fileSharedKeyCredential = new FileStorageSharedKeyCredential(
    account,
    accountKey
  );
  const shareServiceClient = new ShareServiceClient(
    `https://${account}.file.core.windows.net`,
    fileSharedKeyCredential
  );
  await setCors(shareServiceClient);

  console.log("Setting CORS for Queue service.");
  const queueSharedKeyCredential = new QueueStorageSharedKeyCredential(
    account,
    accountKey
  );
  const queueServiceClient = new QueueServiceClient(
    `https://${account}.queue.core.windows.net`,
    queueSharedKeyCredential
  );
  await setCors(queueServiceClient);
}

main()
  .then(() => {
    console.log("Done.");
  })
  .catch((err) => {
    console.log(err.message);
  });
