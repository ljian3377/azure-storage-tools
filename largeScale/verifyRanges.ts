// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/*
 Setup: Enter your storage account name and shared key in main()
*/

import * as fs from "fs";
import { BlobServiceClient, BlockBlobClient } from "@azure/storage-blob";
import { AvroReadableFromStream } from "./AvroReadableFromStream";

// Load the .env file if it exists
import * as dotenv from "dotenv";
console.log(dotenv.config());

// import { setLogLevel } from "@azure/logger";
// setLogLevel("info");

export async function main() {
  const connectStr = process.env.STORAGE_CONNECTION_STRING || "";
  const filePath = process.env.FILE_PATH;
  const blockSize = eval(process.env.BLOCK_SIZE);

  const argv = process.argv.slice(2);
  console.log(argv);
  const start = eval(argv[0]);
  const end = eval(argv[1]);
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

  const blockNum = (end - start) / blockSize;
  console.log(blockNum);
  console.log(end, start, end - start, (end - start) / blockSize);

  const buf = Buffer.allocUnsafe(blockSize);
  const rs = fs.createReadStream(filePath, {
    autoClose: true,
    start,
    end: end - 1,
    highWaterMark: blockSize,
  });

  const fileReadable = new AvroReadableFromStream(rs);

  for (let i = 0; i < blockNum; i++) {
    const rangeStart = start + i * blockSize;
    const rangeEnd =
      rangeStart + blockSize > end ? end : rangeStart + blockSize;
    const chunkSize = rangeEnd - rangeStart;
    console.log(i, rangeStart, rangeEnd, chunkSize);

    await blockBlobClient.downloadToBuffer(buf, rangeStart, chunkSize);

    const fileBuf = (await fileReadable.read(chunkSize)) as Buffer;
    if (!fileBuf.equals(buf.slice(0, chunkSize))) {
      throw new Error(
        `remote and local blob don't match at block ${i}, range ${rangeStart} - ${rangeEnd}`
      );
    }
  }
}

main()
  .then(() => {
    console.log("Successfully executed sample.");
  })
  .catch((err) => {
    console.log(err.message);
  });
