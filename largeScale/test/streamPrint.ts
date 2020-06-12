import * as fs from "fs";
import * as dotenv from "dotenv";
import { abort } from "process";
console.log(dotenv.config());

function toBuffer(bs: Buffer | string) {
  if (typeof bs === "string") {
    bs = Buffer.from(bs);
  }
  return bs;
}

const fileSize = 300503920;
const rangeNum = 1;
const rangeSize = fileSize / rangeNum;
const filePath = process.env.FILE_PATH;

const offset = 0;
const fileStream = fs.createReadStream(filePath, {
  autoClose: true,
  end: offset + rangeSize - 1,
  start: offset,
});

fileStream.on("data", (chunk) => {
  chunk = toBuffer(chunk);
  console.log(chunk);
  abort();
});
