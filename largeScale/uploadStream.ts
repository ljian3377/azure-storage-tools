// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/*
 Setup: Enter your storage account name and shared key in main()
*/

import { BlobServiceClient } from "@azure/storage-blob";

// Load the .env file if it exists
import * as dotenv from "dotenv";
import * as fs from "fs";
console.log(dotenv.config());

import { setLogLevel } from "@azure/logger";
setLogLevel("info");

export async function main() {
  const connectStr = process.env.STORAGE_CONNECTION_STRING || "";
  const chunkSize = eval(process.env.CHUNK_SIZE);
  const filePath = process.env.FILE_PATH;
  const memSize = eval(process.env.MEMORY_SIZE);
  const logInterval = eval(process.env.LOG_INTERVAL);

  const blobServiceClient = BlobServiceClient.fromConnectionString(connectStr);

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

  console.log(`start upload ${filePath} at ${new Date()}`);

  const rs = fs.createReadStream(filePath, {
    highWaterMark: chunkSize / 2,
  });
  const lastLoadedBytes = 0;
  await blockBlobClient.uploadStream(rs, chunkSize, memSize / chunkSize / 2, {
    onProgress: (e) => {
      if (e.loadedBytes - lastLoadedBytes > logInterval) {
        console.log(e.loadedBytes / logInterval, "*", logInterval);
      }
    },
  });
  console.log(`Upload block blob ${blobName} successfully at ${new Date()}`);

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
