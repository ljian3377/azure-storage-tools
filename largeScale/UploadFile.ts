// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/*
 Setup: Enter your storage account name and shared key in main()
*/

import {
  BlobServiceClient,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

// Load the .env file if it exists
import * as dotenv from "dotenv";
import * as fs from "fs";
console.log(dotenv.config());

// import { setLogLevel } from "@azure/logger";
// setLogLevel("info");

export async function main() {
  const account = process.env.ACCOUNT_NAME || "";
  const accountKey = process.env.ACCOUNT_KEY || "";
  const chunkSize = eval(process.env.CHUNK_SIZE);
  const filePath = process.env.FILE_PATH;

  const sharedKeyCredential = new StorageSharedKeyCredential(
    account,
    accountKey
  );
  const blobServiceClient = new BlobServiceClient(
    `https://${account}.blob.core.windows.net`,
    sharedKeyCredential
  );

  // Create a container
  const containerName = `newcontainer${new Date().getTime()}`;
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const createContainerResponse = await containerClient.create();
  console.log(
    `Create container ${containerName} successfully`,
    createContainerResponse.requestId
  );

  // Create a blob
  const blobName = "newblob" + new Date().getTime();
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  const start = new Date();
  console.log(`start upload file ${filePath} at ${start}`);
  await blockBlobClient.uploadFile(filePath, {
    blockSize: chunkSize,
    concurrency: 16,
    onProgress: (e) => {
      console.log(e.loadedBytes);
    },
  });
  const end = new Date();
  console.log(
    `Upload block blob ${blobName} successfully at ${end}, time elapsed ${
      end.getTime() - start.getTime()
    }`
  );

  // verify length
  const expectedLength = fs.statSync(filePath)["size"];
  const getRes = await blockBlobClient.getProperties();
  if (getRes.contentLength !== expectedLength) {
    throw new Error(
      `blob size don't match. uploaded: ${expectedLength}, downloaded: ${getRes.contentLength}`
    );
  }
}

main()
  .then(() => {
    console.log("Successfully executed sample.");
  })
  .catch((err) => {
    console.log(err.message);
  });
