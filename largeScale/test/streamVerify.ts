import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  BlobClient,
} from "@azure/storage-blob";

// Load the .env file if it exists
import * as dotenv from "dotenv";
import * as fs from "fs";
import { off } from "process";
console.log(dotenv.config());

// import { setLogLevel } from "@azure/logger";
// setLogLevel("info");

function chunkCompare(buf: Buffer | String, buf2: Buffer | string): boolean {
  if (typeof buf === "string") {
    buf = Buffer.from(buf);
  }
  if (typeof buf2 === "string") {
    buf2 = Buffer.from(buf2);
  }
  return (buf as Buffer).compare(buf2) === 0;
}

async function streamVerify(
  downStream: NodeJS.ReadableStream,
  fileStream: NodeJS.ReadableStream
) {
  let i = 0;
  return new Promise((resolve, reject) => {
    downStream.on("data", (chunk) => {
      chunk = Buffer.from(chunk);

      let localChunk = fileStream.read(chunk.byteLength);
      if (localChunk) {
        if (!chunkCompare(chunk, localChunk)) {
          if (typeof localChunk === "string") {
            localChunk = Buffer.from(localChunk);
          }
          reject(`miss matched, ${chunk.byteLength} ${localChunk}`);
        }
        return;
      } else {
        const readableCallback = function () {
          localChunk = fileStream.read(chunk.byteLength);
          if (localChunk) {
            fileStream.removeListener("readable", readableCallback);
            if (!chunkCompare(chunk, localChunk)) {
              if (typeof localChunk === "string") {
                localChunk = Buffer.from(localChunk);
              }
              reject(`miss matched, ${chunk.byteLength} ${localChunk}`);
            }
          }
        };

        fileStream.on("readable", readableCallback);
        fileStream.on("end", () => {
          console.log("fileStream ended");
          reject();
        });

        fileStream.on("error", (err) => {
          console.log(`fileStream throw ${err}`);
          reject();
        });
      }
    });

    downStream.on("end", () => {
      console.log("downStream end");
      resolve("end");
    });

    downStream.on("error", () => {
      console.log("downStream err");
      reject();
    });
  });
}

export async function main() {
  const account = process.env.ACCOUNT_NAME || "";
  const accountKey = process.env.ACCOUNT_KEY || "";

  const MB = 1024 * 1024;
  const fileSize = 6 * MB * MB;
  const rangeNum = 32;
  const rangeSize = fileSize / rangeNum;
  const filePath = process.env.FILE_PATH;

  const sharedKeyCredential = new StorageSharedKeyCredential(
    account,
    accountKey
  );
  const blobClient = new BlobClient(
    "https://jianch.blob.core.windows.net/newcontainer1591948757003/newblob1591948757327",
    sharedKeyCredential
  );

  let promiseArray = [];
  for (let i = 0; i < rangeNum; i++) {
    const pro = new Promise(async (resolve, reject) => {
      console.log(`promise called ${i}`);
      const offset = i * rangeSize;
      try {
        console.log(offset, rangeSize);
        const dow = await blobClient.download(offset, rangeSize);

        const fileStream = fs.createReadStream(filePath, {
          autoClose: true,
          end: offset + rangeSize - 1,
          start: offset,
        });

        console.log("file");

        await streamVerify(dow.readableStreamBody, fileStream);
      } catch (err) {
        console.log(`promise failed ${i}: ${err} ${offset} ${rangeSize}`);
        reject(err);
      }
      resolve();
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
    console.log("err:", err.message);
  });
