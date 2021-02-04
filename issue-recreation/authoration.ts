const { BlobServiceClient } = require("@azure/storage-blob");
import { DefaultAzureCredential } from "@azure/identity";
import * as dotenv from "dotenv";
dotenv.config();

const blobServiceClient = new BlobServiceClient(
  `https://${process.env.ACCOUNT_NAME}.blob.core.windows.net`,
  new DefaultAzureCredential()
);

async function main() {
  try {
    const getAccountInfoResponse = await blobServiceClient.getProperties();
    console.log(
      "#####  getAccountInfoResponse #######  :  ",
      getAccountInfoResponse
    );
  } catch (err) {
    console.log("$$$$$$$$$$$$ getAccountInfoResponse $$$$$$$$$$$ ::: ", err);
  }
}

main();
