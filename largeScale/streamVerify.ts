// FIXME: download hang for most of ranges

import { StorageSharedKeyCredential, BlobClient } from "@azure/storage-blob";
import * as util from "util";
// Load the .env file if it exists
import * as dotenv from "dotenv";
import * as fs from "fs";
import { abort } from "process";
console.log(dotenv.config());

export const fsRead = util.promisify(fs.read);
export const fsStat = util.promisify(fs.stat);

const concurrency = eval(process.env.concurrency) || 16;

import { setLogLevel } from "@azure/logger";
setLogLevel("info");

function toBuffer(bs: Buffer | string) {
  if (typeof bs === "string") {
    bs = Buffer.from(bs);
  }
  return bs;
}

async function getFd(fileName: string): Promise<number> {
  return new Promise((resolve, reject) => {
    fs.exists(fileName, function (exists) {
      if (exists) {
        fs.open(fileName, "r", function (error, fd) {
          if (error) {
            reject(error);
          } else {
            resolve(fd);
          }
        });
      } else {
        reject(new Error("File do not exist."));
      }
    });
  });
}

async function compareStreamWithFile(
  downStream: NodeJS.ReadableStream,
  fd: number,
  start: number,
  endExclusize: number
) {
  let consumeNext = true;
  return new Promise((resolve, reject) => {
    downStream.on("readable", async () => {
      let chunk;
      while (consumeNext && null !== (chunk = downStream.read())) {
        consumeNext = false;
        chunk = toBuffer(chunk);
        const fileBuf = new Uint8Array(chunk.byteLength);
        // console.log("Start read file", start, endExclusize, chunk.byteLength, new Date());
        const readRes = await fsRead(fd, fileBuf, 0, chunk.byteLength, start);
        // console.log("done read file", start, endExclusize, new Date());
        if (chunk.compare(readRes.buffer) !== 0) {
          console.log("miscompare start end:", start, endExclusize);
          console.log("chunk len", chunk.byteLength);
          console.log("file len", readRes.bytesRead);
          reject(new Error("miss matched"));
        }

        start += chunk.byteLength;
        if (start === endExclusize) {
          console.log("compare done", start, endExclusize);
          resolve(true);
        }
        consumeNext = true;
      }
    });

    downStream.on("end", () => {
      console.log(`downStream end, ${start} ${endExclusize}`);
      if (start === endExclusize) {
        resolve(true);
      } else {
        // reject(new Error(`file not done yet ${start}, ${endExclusize}`));
      }
    });

    downStream.on("error", () => {
      console.log("downStream err", start, endExclusize);
      reject(new Error("downloadStream err"));
    });

    downStream.on("close", () => {
      console.log("downStream close", start, endExclusize);
      // reject(new Error("downloadStream err"));
    });
  });
}

export async function main() {
  const account = process.env.ACCOUNT_NAME || "";
  const accountKey = process.env.ACCOUNT_KEY || "";

  const filePath = process.env.FILE_PATH;
  const fileSize = (await fsStat(filePath))["size"];
  console.log("file size:", fileSize);

  const rangeSize = Math.floor(fileSize / concurrency);
  console.log(
    `file size: ${fileSize}, concurrency: ${concurrency}, rangeSize: ${rangeSize}`
  );

  const fd = await getFd(filePath);

  const sharedKeyCredential = new StorageSharedKeyCredential(
    account,
    accountKey
  );
  const blobClient = new BlobClient(process.env.BLOB, sharedKeyCredential);

  const getRes = await blobClient.getProperties();
  if (getRes.contentLength !== fileSize) {
    throw new Error(
      `file size don't match, file: ${fileSize}, blob: ${getRes.contentLength}`
    );
  }

  let promiseArray = [];
  for (let i = 0; i < concurrency; i++) {
    const pro = new Promise(async (resolve, reject) => {
      const offset = i * rangeSize;
      const count = i === concurrency - 1 ? fileSize - i * rangeSize : rangeSize;
      try {
        console.log("promise trigger", i, offset, count);
        const dow = await blobClient.download(offset, count, {
          onProgress: (ev) => {
            if (ev.loadedBytes % Math.round(count / 16) === 0) {
              console.log(i, "downloaded Bytes", ev.loadedBytes, new Date());
            }
          }
        });
        console.log("start compare", i);
        await compareStreamWithFile(
          dow.readableStreamBody,
          fd,
          offset,
          offset + count
        );
      } catch (err) {
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
    abort();
  });
