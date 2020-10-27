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
  // console.log("original properties:");
  // console.log(serviceProperties);

  const newCORS = {
    allowedHeaders: "*",
    allowedMethods: "DELETE,GET,HEAD,MERGE,POST,OPTIONS,PUT,PATCH",
    allowedOrigins: "*",
    exposedHeaders: "*",
    maxAgeInSeconds: 86400,
  };
  serviceProperties.cors = [...serviceProperties.cors, newCORS];

  const servicePropertiesToSet = {
    cors: serviceProperties.cors,
  };

  // fix issue introduced by SMB multi-channel
  await serviceClient.setProperties(servicePropertiesToSet);

  // const newServiceProperties = await serviceClient.getProperties();
  // console.log("new properties:");
  // console.log(newServiceProperties);
}

async function main() {
  const account = process.env.ACCOUNT_NAME || "";
  const accountKey = process.env.ACCOUNT_KEY || "";
  let service = process.argv[2];
  console.log("using account:", account, accountKey, service);

  if (!(service === "blob" || service === "file" || service === "queue")) {
    service = undefined;
  }

  if (service === undefined || service === "blob") {
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
  }

  if (service === undefined || service === "file") {
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
  }

  if (service === undefined || service === "queue") {
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
}

main()
  .then(() => {
    console.log("Done.");
  })
  .catch((err) => {
    console.log(err.message);
  });
