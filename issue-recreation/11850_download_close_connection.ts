// node -r ts-node/register --expose-gc 11850_download_close_connection.ts
import { AnonymousCredential, BlobClient } from "@azure/storage-blob";
import { AbortController } from "@azure/abort-controller";
import { Readable } from "stream";

import * as dotenv from "dotenv";
dotenv.config();

function scheduleGc() {
  if (!global.gc) {
    console.log("Garbage collection is not exposed");
    return;
  }

  setTimeout(function () {
    global.gc();
    console.log("Manual gc", process.memoryUsage());
    scheduleGc();
  }, 10 * 1000);
}

// scheduleGc();

async function main() {
  const blobURLWithSAS = process.env.BLOB_URL || "";
  const blobClient = new BlobClient(blobURLWithSAS, new AnonymousCredential(), {
    // keepAliveOptions: { enable: false },
  });

  for (let i = 0; i < 1000; i++) {
    const aborter = new AbortController();
    const res = await blobClient.download(undefined, undefined, {
      abortSignal: aborter.signal,
    });
    console.log(`download call done for ${i}`);

    const stream: Readable = res.readableStreamBody as any;

    stream.on("close", () => {
      console.log(`stream ${i} closed`);
    });

    stream.on("error", (err) => {
      console.log(i, err);
    });

    aborter.abort();
    // stream.destroy();
  }
}

main();
