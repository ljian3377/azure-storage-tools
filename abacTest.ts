import { BlobServiceClient } from "@azure/storage-blob";
import { TokenCredential, DefaultAzureCredential } from "@azure/identity";

// Load the .env file if it exists
import * as dotenv from "dotenv";
dotenv.config();

/**
 * A TokenCredential that always returns the given token. This class can be
 * used when the access token is already known or can be retrieved from an
 * outside source.
 */
export class SimpleTokenCredential implements TokenCredential {
  /**
   * The raw token string.  Can be changed when the token needs to be updated.
   */
  public token: string;

  /**
   * The Date at which the token expires.  Can be changed to update the expiration time.
   */
  public expiresOn: Date;

  /**
   * Creates an instance of TokenCredential.
   * @param {string} token
   */
  constructor(token: string, expiresOn?: Date) {
    this.token = token;
    this.expiresOn = expiresOn
      ? expiresOn
      : new Date(Date.now() + 60 * 60 * 1000);
  }

  /**
   * Retrieves the token stored in this RawTokenCredential.
   *
   * @param _scopes Ignored since token is already known.
   * @param _options Ignored since token is already known.
   * @returns {AccessToken} The access token details.
   */
  async getToken(_scopes: string | string[], _options?) {
    return {
      token: this.token,
      expiresOnTimestamp: this.expiresOn.getTime(),
    };
  }
}

export async function main() {
  // Enter your storage account name
  const account = process.env.ACCOUNT_NAME || "";
  const tokenCredential = new SimpleTokenCredential(process.env.ACCOUNT_TOKEN);
  const blobServiceClient = new BlobServiceClient(
    `https://${account}.blob.core.windows.net`,
    tokenCredential
  );

  const blobA = blobServiceClient
    .getContainerClient("abactest")
    .getBlobClient("CHANGELOG.md");
  await blobA.getProperties();

  const blobB = blobServiceClient
    .getContainerClient("abactest")
    .getBlobClient("sample.env");
  await blobB.getProperties();
}

main().catch((err) => {
  console.error("Error running sample:", err);
});
