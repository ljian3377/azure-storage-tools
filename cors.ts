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
        // `https://${account}.file.core.windows.net`,
        `https://${account}.blob.preprod.core.windows.net`,
        // `http://127.0.0.1:10001/${account}`,
        sharedKeyCredential
    );

    // set CORS
    const serviceProperties = await serviceClient.getProperties();

    const newCORS = {
        allowedHeaders: "*",
        allowedMethods: "DELETE,GET,HEAD,MERGE,POST,OPTIONS,PUT",
        allowedOrigins: "*",
        exposedHeaders: "*",
        maxAgeInSeconds: 86400
    };

    if (!serviceProperties.cors) {
        serviceProperties.cors = [newCORS];
    } else {
        console.log("original cors:");
        console.log(serviceProperties.cors);
        if (serviceProperties.cors!.length < 5) {
            serviceProperties.cors.push(newCORS);
        }
    }
    await serviceClient.setProperties(serviceProperties);
    
    const newServiceProperties = await serviceClient.getProperties();
    console.log("new cors:");
    console.log(newServiceProperties.cors);
}

main()
    .then(() => {
        console.log("Done.");
    })
    .catch((err) => {
        console.log(err.message);
    });