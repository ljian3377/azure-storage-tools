// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/*
  ONLY AVAILABLE IN NODE.JS RUNTIME

  Setup :
    - Reference - Authorize access to blobs and queues with Azure Active Directory from a client application 
      - https://docs.microsoft.com/en-us/azure/storage/common/storage-auth-aad-app
 
    - Register a new AAD application and give permissions to access Azure Storage on behalf of the signed-in user
      - Register a new application in the Azure Active Directory(in the azure-portal) - https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app
      - In the `API permissions` section, select `Add a permission` and choose `Microsoft APIs`. 
      - Pick `Azure Storage` and select the checkbox next to `user_impersonation` and then click `Add permissions`. This would allow the application to access Azure Storage on behalf of the signed-in user.
    - Grant access to Azure Blob data with RBAC in the Azure Portal 
      - RBAC roles for blobs and queues - https://docs.microsoft.com/en-us/azure/storage/common/storage-auth-aad-rbac-portal.
      - In the azure portal, go to your storage-account and assign **Storage Blob Data Contributor** role to the registered AAD application from `Access control (IAM)` tab (in the left-side-navbar of your storage account in the azure-portal). 
    
    - Environment setup for the sample
      - From the overview page of your AAD Application, note down the `CLIENT ID` and `TENANT ID`. In the "Certificates & Secrets" tab, create a secret and note that down.
      - Make sure you have AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET as environment variables to successfully execute the sample(Can leverage process.env).
*/

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

  // Azure AD Credential information is required to run this sample:
  if (
    !process.env.AZURE_TENANT_ID ||
    !process.env.AZURE_CLIENT_ID ||
    !process.env.AZURE_CLIENT_SECRET
  ) {
    console.warn(
      "Azure AD authentication information not provided, but it is required to run this sample. Exiting."
    );
    return;
  }

  const now = new Date();
  const later = new Date(now.getTime() + 3600 * 1000);

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
  const defaultAzureCredential = new DefaultAzureCredential();
  const blobServiceClient = new BlobServiceClient(
    `https://${account}.blob.core.windows.net`,
    defaultAzureCredential
  );

  const res = await blobServiceClient.getUserDelegationKey(now, later);
  console.log(res);

  const accessToken = await defaultAzureCredential.getToken(
    "https://storage.azure.com/.default"
  );
  console.log(accessToken);

  const tokenCredential = new SimpleTokenCredential(accessToken.token);
  const blobServiceClient2 = new BlobServiceClient(
    `https://${account}.blob.core.windows.net`,
    tokenCredential
  );
  await blobServiceClient2.getUserDelegationKey(now, later);
}

main().catch((err) => {
  console.error("Error running sample:", err.message);
});
