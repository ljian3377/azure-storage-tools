import * as dotenv from "dotenv";
dotenv.config();

import { ShareServiceClient, StorageSharedKeyCredential } from "@azure/storage-file-share";

async function main() {
    const account = process.env.ACCOUNT_NAME || "";
    const accountKey = process.env.ACCOUNT_KEY || "";
    console.log("using account:", account, accountKey);
    const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);
    const serviceClient = new ShareServiceClient(
        // When using AnonymousCredential, following url should include a valid SAS
        // `https://${account}.queue.core.windows.net`,
        `https://${account}.file.core.windows.net`,
        // `https://${account}.blob.preprod.core.windows.net`,
        // `http://127.0.0.1:10001/${account}`,
        sharedKeyCredential
    );

    for await (const item of serviceClient.listShares()) {
        const shareClient = serviceClient.getShareClient(item.name);
        await shareClient.delete();
    }
}

main()
    .then(() => {
        console.log("Done.");
    })
    .catch((err) => {
        console.log(err.message);
    });
