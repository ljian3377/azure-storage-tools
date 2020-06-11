/* 
 Setup: Enter your storage account name and shared key in main()
*/

const { DataLakeServiceClient, StorageSharedKeyCredential } = require("../.."); // Change to "@azure/storage-file-datalake" in your package
const { randomBytes, createHash } = require("crypto");
const { Readable } = require("stream");

// import { setLogLevel } from "@azure/logger";
// setLogLevel("info");

function md5(input: string | Buffer | Uint8Array) {
  return createHash('md5').update(input).digest('hex');
}

function toBuffer(data: string | Buffer): Buffer {
  if (typeof data === "string") {
    return Buffer.from(data);
  }
  return data;
}

async function main() {
  // Enter your storage account name and shared key
  const account = process.env.ACCOUNT_NAME || "";
  const accountKey = process.env.ACCOUNT_KEY || "";

  // Use StorageSharedKeyCredential with storage account and account key
  // StorageSharedKeyCredential is only avaiable in Node.js runtime, not in browsers
  const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);

  // ONLY AVAILABLE IN NODE.JS RUNTIME
  // DefaultAzureCredential will first look for Azure Active Directory (AAD)
  // client secret credentials in the following environment variables:
  //
  // - AZURE_TENANT_ID: The ID of your AAD tenant
  // - AZURE_CLIENT_ID: The ID of your AAD app registration (client)
  // - AZURE_CLIENT_SECRET: The client secret for your AAD app registration
  //
  // If those environment variables aren't found and your application is deployed
  // to an Azure VM or App Service instance, the managed service identity endpoint
  // will be used as a fallback authentication source.
  // const defaultAzureCredential = new DefaultAzureCredential();

  // You can find more TokenCredential implementations in the [@azure/identity](https://www.npmjs.com/package/@azure/identity) library
  // to use client secrets, certificates, or managed identities for authentication.

  // Use AnonymousCredential when url already includes a SAS signature
  // const anonymousCredential = new AnonymousCredential();

  // List file systems
  const serviceClient = new DataLakeServiceClient(
    // When using AnonymousCredential, following url should include a valid SAS or support public access
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
  console.log(`Create file ${fileName} successfully`);

  // const chunkSize = 4000 * 1024 * 1024;
  const chunkSize = 40 * 1024 * 1024;
  // const blockNum = BLOCK_BLOB_MAX_BLOCKS;
  const blockNum = 1;
  let totalSize = 0;
  const chunkNumToVerifyBytes = 2;
  let uploadedBuffers: Buffer[] = new Array(chunkNumToVerifyBytes * 2);
  let uploadHashs: string[] = new Array(blockNum * 2);
  let promiseArray = [];

  for (let i = 0; i < blockNum; i++) {
    let generatedChunk = 0;
    const randomStream = new Readable({
      read() {
        console.log(i);
        if (generatedChunk < 2) {
          const buf = randomBytes(chunkSize / 2);
          this.push(buf, 'hex');
          const index = i * 2 + generatedChunk;
          if (i < chunkNumToVerifyBytes) {
            uploadedBuffers[index] = buf;
          }
          uploadHashs[index] = md5(buf);
          generatedChunk++;
        } else {
          this.push(null);
        }
      }
    });

    promiseArray.push(fileClient.append(() => randomStream, chunkSize * i, chunkSize));
    totalSize += chunkSize;
  }

  await Promise.all(promiseArray);
  console.log(`append done`);

  const flushFileResponse = await fileClient.flush(totalSize);
  console.log(`Upload file ${fileName} successfully`, flushFileResponse.requestId);

  const getRes = await fileClient.getProperties();
  if (getRes.contentLength !== totalSize) {
    throw new Error(`downloaded size do not match, downloaded ${getRes.contentLength}, uploaded ${totalSize}`);
  }

  const readFileResponse = await fileClient.read();
  await streamVerify(readFileResponse.readableStreamBody, chunkSize / 2, uploadHashs, uploadedBuffers);

  // Delete filesystem
  await fileSystemClient.delete();
  console.log("Deleted filesystem");
}

async function streamVerify(readableStream: NodeJS.ReadableStream, chunkSize: number, hashArray: string[], dataArray: Buffer[]) {
  let i = 0;
  readableStream.pause();
  console.log("start verify")
  return new Promise((resolve, reject) => {
    readableStream.on("readable", () => {
      let chunk = readableStream.read(chunkSize);
      while (chunk) {
        let buf = toBuffer(chunk);
        if (dataArray.length > i && dataArray[i].compare(buf) !== 0) {
          reject(new Error(`data check failed at ${i}`));
        }

        if (hashArray.length > i && hashArray[i] !== md5(buf)) {
          reject(new Error(`md5 check failed at ${i}`));
        }
        console.log(`streamVerify ${i}`);
        i++;
        chunk = readableStream.read(chunkSize);
      }
    });
    readableStream.on("end", () => {
      if (i < hashArray.length) {
        reject(new Error(`do not have enough data, ${i}`));
      }
      resolve("end");
    });
    readableStream.on("error", reject);
  });
}

// An async method returns a Promise object, which is compatible with then().catch() coding style.
main()
  .then(() => {
    console.log("Successfully executed sample.");
  })
  .catch((err) => {
    console.log(err.message);
  });
