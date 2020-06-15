/* 
 Setup: Enter your storage account name and shared key in main()
*/

import {
  DataLakeServiceClient,
  StorageSharedKeyCredential,
} from "@azure/storage-file-datalake";
import * as fs from "fs";

import * as dotenv from "dotenv";
console.log(dotenv.config());

import { setLogLevel } from "@azure/logger";
setLogLevel("info");

async function main() {
  const account = process.env.ACCOUNT_NAME || "";
  const accountKey = process.env.ACCOUNT_KEY || "";

  const sharedKeyCredential = new StorageSharedKeyCredential(
    account,
    accountKey
  );
  const serviceClient = new DataLakeServiceClient(
    `https://${account}.dfs.core.windows.net`,
    sharedKeyCredential
  );

  // Create a filesystem
  const fileSystemName = `newfilesystem${new Date().getTime()}`;
  const fileSystemClient = serviceClient.getFileSystemClient(fileSystemName);

  const createFileSystemResponse = await fileSystemClient.create();
  console.log(
    `Create filesystem ${fileSystemName} successfully`,
    createFileSystemResponse.requestId
  );

  // Create a file
  const fileName = "newfile" + new Date().getTime();
  const fileClient = fileSystemClient.getFileClient(fileName);
  await fileClient.create();
  console.log(`Create file ${fileName} successfully at ${new Date()}`);

  const uploadRes = await fileClient.uploadFile(process.env.FILE_PATH, {
    onProgress: (ev) => {
      console.log(ev.loadedBytes);
    },
    chunkSize: eval(process.env.CHUNK_SIZE),
    maxConcurrency: 16,
  });

  console.log(
    `Upload file ${fileName} successfully at ${new Date()}`,
    uploadRes.requestId
  );

  const expectedLength = fs.statSync(process.env.FILE_PATH)["size"];
  const getRes = await fileClient.getProperties();
  if (getRes.contentLength !== expectedLength) {
    throw new Error(
      `file size don't match. uploaded: ${expectedLength}, in azure: ${getRes.contentLength}`
    );
  }
}

// An async method returns a Promise object, which is compatible with then().catch() coding style.
main()
  .then(() => {
    console.log("Successfully executed sample.");
  })
  .catch((err) => {
    console.log(err.message);
  });
