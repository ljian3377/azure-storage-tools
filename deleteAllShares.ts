import * as dotenv from "dotenv";
console.log(dotenv.config());

import {
  ShareServiceClient,
  StorageSharedKeyCredential,
} from "@azure/storage-file-share";

async function main() {
  const account = process.env.ACCOUNT_NAME || "";
  const accountKey = process.env.ACCOUNT_KEY || "";
  const sharedKeyCredential = new StorageSharedKeyCredential(
    account,
    accountKey
  );
  const serviceClient = new ShareServiceClient(
    `https://${account}.file.core.windows.net`,
    sharedKeyCredential
  );

  for await (const item of serviceClient.listShares()) {
    const shareClient = serviceClient.getShareClient(item.name);
    try {
    await shareClient.delete({deleteSnapshots: "include-leased"});
    } catch(e){}
  }
}

main()
  .then(() => {
    console.log("Done.");
  })
  .catch((err) => {
    console.log(err.message);
  });
