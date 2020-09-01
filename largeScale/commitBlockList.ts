// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/*
 Setup: Enter your storage account name and shared key in main()
*/

import { BlobServiceClient, BlockBlobClient } from "@azure/storage-blob";

// Load the .env file if it exists
import * as dotenv from "dotenv";
console.log(dotenv.config());

import { setLogLevel } from "@azure/logger";
setLogLevel("info");

export async function main() {
  const connectStr = process.env.STORAGE_CONNECTION_STRING || "";
  const BLOCK_BLOB_MAX_BLOCKS: number = 50000;

  const blobServiceClient = BlobServiceClient.fromConnectionString(connectStr);
  const blobUrl =
    "https://3ho3xnxscnapcan.blob.core.windows.net/newcontainer1598405811439/newblob1598405811576";
  const blockBlobClient = new BlockBlobClient(
    blobUrl,
    blobServiceClient.credential
  );
  const listResponse = await blockBlobClient.getBlockList("uncommitted");

  const blockList = [];
  for (let i = 0; i < BLOCK_BLOB_MAX_BLOCKS; i++) {
    blockList.push(listResponse.uncommittedBlocks[i].name);
  }

  await blockBlobClient.commitBlockList(blockList);
  const listResponse2 = await blockBlobClient.getBlockList("committed");
  console.log(listResponse2.committedBlocks.length);
}

main()
  .then(() => {
    console.log("Successfully executed sample.");
  })
  .catch((err) => {
    console.log(err.message);
  });
