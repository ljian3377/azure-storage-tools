// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/*
 Setup: Enter your storage account name and shared key in main()
*/

import * as fs from "fs";
import { BlobServiceClient, BlockBlobClient } from "@azure/storage-blob";

// Load the .env file if it exists
import * as dotenv from "dotenv";
console.log(dotenv.config());

import { setLogLevel } from "@azure/logger";
setLogLevel("info");

export async function main() {
  const connectStr = process.env.STORAGE_CONNECTION_STRING || "";
  const filePath = process.env.FILE_PATH;

  const argv = process.argv.slice(2);
  console.log(argv);
  const start = parseInt(argv[0]);
  const end = parseInt(argv[1]);
  if (start === NaN || end === NaN) {
    throw new Error(
      `Invalid start or end in the input parameters ${argv[0]} ${argv[1]}`
    );
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(connectStr);
  const blobUrl =
    "https://3ho3xnxscnapcan.blob.core.windows.net/newcontainer1598405811439/newblob1598405811576";
  const blockBlobClient = new BlockBlobClient(
    blobUrl,
    blobServiceClient.credential
  );

  const blockSize = 2000 * 1024 * 1024;
  const blockNum = (end - start) / blockSize;

  let promiseArray = [];
  for (let i = 0; i < blockNum; i++) {
    const pro = new Promise(async (resolve, reject) => {
      const rangeStart = start + i * blockSize;
      const rangeEnd = (i === blockNum? end: rangeStart + blockSize);
      const buf = await blockBlobClient.downloadToBuffer(rangeStart, rangeEnd - rangeStart);
      const rs = fs.createReadStream(filePath, {
        autoClose: true,
        start: rangeStart,
        end: rangeEnd - 1,
      });
      let offset = 0;
      rs.on("data", (data) => {
        data = typeof data === "string" ? Buffer.from(data) : data;
        const chunk = buf.slice(offset, offset + data.byteLength);
        if (!data.equals(chunk) {
          reject(new Error(`Contents don't match at block ${i}, offset ${offset}`))
        }

        offset += data.byteLength;
      });

      rs.on("end", () => {
        console.log(`comparison done for block ${i}, rangeStart: ${rangeStart}`);
        resolve("");
      });
      rs.on("error", reject);
    });
    promiseArray.push(pro);
  }

  await Promise.all(promiseArray);
}

main()
  .then(() => {
    console.log("Successfully executed sample.");
  })
  .catch((err) => {
    console.log(err.message);
  });
