// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/*
 Setup: Enter your storage account name and shared key in main()
*/

import {
  BlobServiceClient,
  StorageSharedKeyCredential,
} from "../../../src";

// Load the .env file if it exists
import * as dotenv from "dotenv";
dotenv.config();

import { Readable } from "stream";
import * as fs from "fs";

export async function main() {
  // Enter your storage account name and shared key
  const account = process.env.ACCOUNT_NAME || "";
  const accountKey = process.env.ACCOUNT_KEY || "";

  // Use StorageSharedKeyCredential with storage account and account key
  // StorageSharedKeyCredential is only available in Node.js runtime, not in browsers
  const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);

  // List containers
  const blobServiceClient = new BlobServiceClient(
    // When using AnonymousCredential, following url should include a valid SAS or support public access
    `https://${account}.blob.preprod.core.windows.net`,
    sharedKeyCredential
  );

  // Create a container
  const containerName = `newcontainer${new Date().getTime()}`;
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const createContainerResponse = await containerClient.create();
  console.log(`Create container ${containerName} successfully`, createContainerResponse.requestId);

  // Create a blob
  const blobName = "newblob" + new Date().getTime();
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  const chunkSize = 4 * 1024 * 1024;
  const filePath = "S:\dev\azure-sdk-for-js\sdk\storage\storage-blob\samples\typescript\src\jumboUpload.ts"
  await blockBlobClient.uploadFile(filePath, { blockSize: chunkSize })
  console.log(`Upload block blob ${blobName} successfully`);

  // verify length
  const expectedLength = fs.statSync(filePath)["size"];
  const getRes = await blockBlobClient.getProperties();
  if (getRes.contentLength !== expectedLength) {
    throw new Error(`blob size doesn't match. uploaded: ${expectedLength}, downloaded: ${getRes.contentLength}`);
  }

  // parallel download and verify data

}

async function streamVerify(stream: NodeJS.ReadableStream, streamFromFile: NodeJS.ReadableStream) {
  return new Promise((resolve, reject) => {
    streamFromFile.pause();
    streamFromFile.on("error", reject);

    stream.on("data", (data) => {

      const length = data.b
    })
  });
}