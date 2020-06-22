import {
  StorageSharedKeyCredential,
  BlobServiceClient,
} from "@azure/storage-blob";

import * as dotenv from "dotenv";
console.log(dotenv.config());

async function main() {
  const account = process.env.ACCOUNT_NAME || "";
  const accountKey = process.env.ACCOUNT_KEY || "";

  const sharedKeyCredential = new StorageSharedKeyCredential(
    account,
    accountKey
  );

  const serviceClient = new BlobServiceClient(
    `https://${account}.blob.core.windows.net`,
    sharedKeyCredential
  );

  for await (const item of serviceClient.listContainers()) {
    const containerClient = serviceClient.getContainerClient(item.name);
    await containerClient.delete();
  }
}

main()
  .then(() => {
    console.log("Done.");
  })
  .catch((err) => {
    console.log(err.message);
  });
