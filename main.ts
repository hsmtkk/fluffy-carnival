// Copyright (c) HashiCorp, Inc
// SPDX-License-Identifier: MPL-2.0
import { Construct } from "constructs";
import { App, TerraformStack, CloudBackend, NamedCloudWorkspace, TerraformAsset, AssetType } from "cdktf";
import * as google from '@cdktf/provider-google';
import * as path from 'path';

const project = 'fluffy-carnival-370321';
const region = 'asia-northeast1';
//const repository = 'fluffy-carnival';

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new google.provider.GoogleProvider(this, 'google', {
      project,
      region,
    });

    const my_service_account = new google.serviceAccount.ServiceAccount(this, 'my_service_account', {
      accountId: 'my-service-account',
      displayName: 'service account for this application',
    });

    const my_asset = new TerraformAsset(this, 'my_asset', {
      path: path.resolve('function'),
      type: AssetType.ARCHIVE,
    });

    const my_bucket = new google.storageBucket.StorageBucket(this, 'my_bucket', {
      location: region,
      name: `my-bucket-${project}`,
    });

    const my_object = new google.storageBucketObject.StorageBucketObject(this, 'my_object', {
      bucket: my_bucket.name,
      name: `${my_asset.assetHash}.zip`,
      source: my_asset.path,
    });

    const my_function = new google.cloudfunctions2Function.Cloudfunctions2Function(this, 'my_function', {
      buildConfig: {
        entryPoint: 'HelloGet',
        runtime: 'go119',
        source: {
          storageSource: {
            bucket: my_bucket.name,
            object: my_object.name,
          },
        },
      },
      location: region,
      name: 'my-function',
      serviceConfig: {
        minInstanceCount: 0,
        maxInstanceCount: 1,
        serviceAccountEmail: my_service_account.email,
      },
    });

    const data_policy = new google.dataGoogleIamPolicy.DataGoogleIamPolicy(this, 'data_policy', {
      binding: [{
        role: 'roles/cloudfunctions.invoker',
        members: ['allUsers'],
      }],
    });

    new google.cloudfunctions2FunctionIamPolicy.Cloudfunctions2FunctionIamPolicy(this, 'my_policy', {
      cloudFunction: my_function.name,
      location: region,
      policyData: data_policy.policyData,
    });

  }
}

const app = new App();
const stack = new MyStack(app, "fluffy-carnival");
new CloudBackend(stack, {
  hostname: "app.terraform.io",
  organization: "hsmtkkdefault",
  workspaces: new NamedCloudWorkspace("fluffy-carnival")
});
app.synth();
