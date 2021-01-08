// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// In browser, during webpack or browserify bundling, this module will be replaced by 'events'
// https://github.com/Gozala/events
import { EventEmitter } from "events";

/**
 * Operation is an async function to be executed and managed by Batch.
 */
declare type Operation = () => Promise<any>;

/**
 * States for Batch.
 *
 * @enum {number}
 */
enum BatchStates {
  Good,
  Error,
  Pausing,
  Paused,
}

/**
 * Batch provides basic parallel execution with concurrency limits.
 * Will stop execute left operations when one of the executed operation throws an error.
 * But Batch cannot cancel ongoing operations, you need to cancel them by yourself.
 *
 */
class Batch {
  /**
   * Concurrency. Must be lager than 0.
   *
   * @type {number}
   * @memberof Batch
   */
  private concurrency: number;

  /**
   * Number of active operations under execution.
   *
   * @private
   * @type {number}
   * @memberof Batch
   */
  private actives: number = 0;

  /**
   * Number of completed operations under execution.
   *
   * @private
   * @type {number}
   * @memberof Batch
   */
  private completed: number = 0;

  /**
   * Offset of next operation to be executed.
   *
   * @private
   * @type {number}
   * @memberof Batch
   */
  private offset: number = 0;

  /**
   * Operation array to be executed.
   *
   * @private
   * @type {Operation[]}
   * @memberof Batch
   */
  private operations: Operation[] = [];

  /**
   * Operation to be executed when all parallel operations are done.
   *
   * @public
   * @type {Operation}
   * @memberof Batch
   */
  public completeOperation: Operation;

  /**
   * States of Batch. When an error happens, state will turn into error.
   * Batch will stop execute left operations.
   *
   * @private
   * @type {BatchStates}
   * @memberof Batch
   */
  private state: BatchStates = BatchStates.Good;

  /**
   * A private emitter used to pass events inside this class.
   *
   * @private
   * @type {EventEmitter}
   * @memberof Batch
   */
  private emitter: EventEmitter;

  /**
   * Creates an instance of Batch.
   * @param {number} [concurrency=5]
   * @memberof Batch
   */
  public constructor(concurrency: number = 5) {
    if (concurrency < 1) {
      throw new RangeError("concurrency must be larger than 0");
    }
    this.concurrency = concurrency;
    this.emitter = new EventEmitter();
  }

  /**
   * Add a operation into queue.
   *
   * @param {Operation} operation
   * @memberof Batch
   */
  public addOperation(operation: Operation): void {
    this.operations.push(async () => {
      try {
        this.actives++;
        await operation();
        this.actives--;
        this.completed++;
        this.parallelExecute();
      } catch (error) {
        this.state = BatchStates.Error;
        this.emitter.emit("error", error);
      }
    });
  }

  /**
   * Start execute operations in the queue.
   * Need to resume the Batch operation first if it's paused.
   *
   * @returns {Promise<void>}
   * @memberof Batch
   */
  public async do(): Promise<void> {
    if (this.operations.length === 0) {
      return Promise.resolve();
    }

    if (this.state === BatchStates.Error) {
      return Promise.reject("Batch operations already failed.");
    }

    this.parallelExecute();

    return new Promise<void>((resolve, reject) => {
      const cleanUp = () => {};

      const errorCallback = (error) => {
        cleanUp();
        reject(error);
      };

      const finishCallback = () => {
        cleanUp();
        resolve();
      };

      this.emitter.once("finish", finishCallback);
      this.emitter.once("error", errorCallback);
    });
  }

  /**
   * Try to pause operations in the queue.
   * Will wait for active operations to finish.
   *
   * @returns {Promise<void>}
   * @memberof Batch
   */
  public async pause(): Promise<void> {
    if (this.operations.length === 0) {
      return Promise.reject("No operation was added to Batch.");
    }
    if (this.state === BatchStates.Error) {
      return Promise.reject("Batch operations already failed.");
    }
    if (this.state === BatchStates.Paused) {
      return Promise.resolve();
    }

    if (this.state === BatchStates.Good) {
      this.state = BatchStates.Pausing;
    }

    return new Promise<void>((resolve, reject) => {
      const cleanUp = () => {
        this.emitter.removeListener("paused", pausedCallback);
        this.emitter.removeListener("finish", finishCallback);
        this.emitter.removeListener("error", errorCallback);
      };

      const errorCallback = (error) => {
        cleanUp();
        reject(error);
      };

      const finishCallback = () => {
        cleanUp();
        reject("Batch operations already finished.");
      };

      const pausedCallback = () => {
        cleanUp();
        resolve();
      };

      this.emitter.once("pasued", pausedCallback);
      this.emitter.once("finish", finishCallback);
      this.emitter.once("error", errorCallback);
    });
  }

  /**
   * Resume execute operations in the queue.
   *
   * @returns {Promise<void>}
   * @memberof Batch
   */
  public resume(): boolean {
    if (this.operations.length === 0) {
      throw new Error("No operation was added to Batch.");
    }
    if (this.state === BatchStates.Error) {
      throw new Error("Batch operation already failed.");
    }

    if (this.state === BatchStates.Paused) {
      this.state = BatchStates.Good;
      this.parallelExecute();
      return true;
    }

    return false;
  }

  /**
   * Get next operation to be executed. Return null when reaching ends.
   *
   * @private
   * @returns {(Operation | null)}
   * @memberof Batch
   */
  private nextOperation(): Operation | null {
    if (this.offset < this.operations.length) {
      return this.operations[this.offset++];
    }
    return null;
  }

  /**
   * Start execute operations. One one the most important difference between
   * this method with do() is that do() wraps as an sync method.
   *
   * @private
   * @returns {void}
   * @memberof Batch
   */
  private parallelExecute(): void {
    if (this.state === BatchStates.Error || this.state === BatchStates.Paused) {
      return;
    }

    if (this.completed >= this.operations.length) {
      this.completeOperation()
        .then(() => {
          this.emitter.emit("finish");
        })
        .catch((err) => {
          this.emitter.emit("error", err);
        });
      return;
    }

    if (this.actives === 0 && this.state === BatchStates.Pausing) {
      this.state = BatchStates.Paused;
      this.emitter.emit("pasued");
      return;
    }

    if (this.state === BatchStates.Good) {
      while (this.actives < this.concurrency) {
        const operation = this.nextOperation();
        if (operation) {
          operation();
        } else {
          return;
        }
      }
    }
  }
}

import { BlockBlobClient } from "@azure/storage-blob";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";
import * as util from "util";
const fsStat = util.promisify(fs.stat);

/**
 * Base64 encode.
 *
 * @param {string} content
 * @returns {string}
 */
function base64encode(content: string): string {
  return Buffer.from(content).toString("base64");
}

/**
 * Generate a 64 bytes base64 block ID string.
 * Need this because for a given blob, the length the blockid must be the same size for each block.
 *
 * @param {number} blockIndex
 * @returns {string}
 */
export function generateBlockID(
  blockIDPrefix: string,
  blockIndex: number
): string {
  // To generate a 64 bytes base64 string, source string should be 48
  const maxSourceStringLength = 48;

  // A blob can have a maximum of 100,000 uncommitted blocks at any given time
  const maxBlockIndexLength = 6;

  const maxAllowedBlockIDPrefixLength =
    maxSourceStringLength - maxBlockIndexLength;

  if (blockIDPrefix.length > maxAllowedBlockIDPrefixLength) {
    blockIDPrefix = blockIDPrefix.slice(0, maxAllowedBlockIDPrefixLength);
  }
  const res =
    blockIDPrefix +
    blockIndex
      .toString()
      .padStart(maxSourceStringLength - blockIDPrefix.length, "0");
  return base64encode(res);
}

async function main() {
  // Fill in following settings before running this sample
  const destBlobUrlWithSAS = process.env.DEST_BLOB || "";
  const filePath = process.env.FILE_PATH || "";

  const size = (await fsStat(filePath)).size;
  const concurrency = 5;
  const blockSize = 16 * 1024;
  const numBlocks: number = Math.floor((size - 1) / blockSize) + 1;

  const onProgress = (progress) => {
    console.log(progress);
  };

  const blockList: string[] = [];
  const blockIDPrefix = uuidv4();
  let transferProgress: number = 0;
  const blockBlobClient = new BlockBlobClient(destBlobUrlWithSAS);

  const batch = new Batch(concurrency);
  for (let i = 0; i < numBlocks; i++) {
    batch.addOperation(
      async (): Promise<any> => {
        const blockID = generateBlockID(blockIDPrefix, i);
        const start = blockSize * i;
        const end = i === numBlocks - 1 ? size : start + blockSize;
        const contentLength = end - start;
        blockList.push(blockID);
        await blockBlobClient.stageBlock(
          blockID,
          () =>
            fs.createReadStream(filePath, {
              autoClose: true,
              end,
              start,
            }),
          contentLength
        );

        transferProgress += contentLength;
        if (onProgress) {
          onProgress!({
            loadedBytes: transferProgress,
          });
        }
      }
    );
  }

  batch.completeOperation = async () => {
    await blockBlobClient.commitBlockList(blockList);
  };

  const doneCallback = async () => {
    console.log(`Stage blocks done.`);
  };

  batch
    .do()
    .then(doneCallback)
    .catch((err) => {
      console.log(`Stage blocks failed with ${err}`);
    });
}
