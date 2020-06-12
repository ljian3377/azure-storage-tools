// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/*
 Setup: Enter your storage account name and shared key in main()
*/

import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  BlobClient,
} from "@azure/storage-blob";

// Load the .env file if it exists
import * as dotenv from "dotenv";
import * as fs from "fs";
console.log(dotenv.config());

import { setLogLevel } from "@azure/logger";
setLogLevel("info");

export async function main() {
  const account = process.env.ACCOUNT_NAME || "";
  const accountKey = process.env.ACCOUNT_KEY || "";
  const md5 = Buffer.from(process.env.MD5);

  const sharedKeyCredential = new StorageSharedKeyCredential(
    account,
    accountKey
  );

  const blobClient = new BlobClient(
    "https://jianch.blob.core.windows.net/newcontainer1591948757003/newblob1591948757327",
    sharedKeyCredential
  );
  await blobClient.setHTTPHeaders({ blobContentMD5: md5 });
  console.log(`set http header`);
}

main()
  .then(() => {
    console.log("Successfully executed sample.");
  })
  .catch((err) => {
    console.log(err.message);
  });
