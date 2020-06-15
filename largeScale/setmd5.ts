// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/*
 Setup: Enter your storage account name and shared key in main()
*/

import { StorageSharedKeyCredential, BlobClient } from "@azure/storage-blob";
// import * as crypto from "crypto";

// Load the .env file if it exists
import * as dotenv from "dotenv";
console.log(dotenv.config());

import { setLogLevel } from "@azure/logger";
setLogLevel("info");

export async function main() {
  const account = process.env.ACCOUNT_NAME || "";
  const accountKey = process.env.ACCOUNT_KEY || "";
  const md5 = Buffer.from(process.env.MD5, "hex");

  const sharedKeyCredential = new StorageSharedKeyCredential(
    account,
    accountKey
  );

  const blobClient = new BlobClient(process.env.BLOB, sharedKeyCredential);
  await blobClient.setHTTPHeaders({ blobContentMD5: md5 });
  console.log(`set md5 done`);

  const getRes = await blobClient.getProperties();
  console.log("md5 in azure:", getRes.contentMD5);
  console.log("md5 local:", md5);

  if (!arrayEqual(getRes.contentMD5, md5)) {
    throw new Error("content MD5 do not match");
  }
}

function arrayEqual(buf1: Uint8Array, buf2: Uint8Array) {
  if (buf1.byteLength != buf2.byteLength) return false;
  for (let i = 0; i < buf1.byteLength; i++) {
    if (buf1[i] != buf2[i]) return false;
  }
  return true;
}

main()
  .then(() => {
    console.log("Successfully executed sample.");
  })
  .catch((err) => {
    console.log(err.message);
  });
