// Copyright (c) HashiCorp, Inc
// SPDX-License-Identifier: MPL-2.0
import { Construct } from "constructs";
import { App, TerraformStack, CloudBackend, NamedCloudWorkspace } from "cdktf";
import * as google from '@cdktf/provider-google';

const project = 'fluffy-carnival-370321';
const region = 'asia-northeast1';
const repository = 'fluffy-carnival';

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new google.provider.GoogleProvider(this, 'google', {
      project,
      region,
    });

    new google.cloudbuildTrigger.CloudbuildTrigger(this, 'cloud_build_trigger', {
      filename: 'cloudbuild.yaml',
      github: {
        owner: 'hsmtkk',
        name: repository,
        push: {
          branch: 'main',
        },
      },
    });

    new google.artifactRegistryRepository.ArtifactRegistryRepository(this, 'artifact_registry', {
      format: 'docker',
      location: region,
      repositoryId: 'my-registry',
    });

    const service_account = new google.serviceAccount.ServiceAccount(this, 'service_account', {
      accountId: 'my-service-account',
      displayName: 'service account for this application',
    });

    new google.pubsubTopic.PubsubTopic(this, 'pub_sub_topic', {
      name: 'my-topic',
    });

    const cloud_run_service = new google.cloudRunService.CloudRunService(this, 'cloud_run_service', {
      autogenerateRevisionName: true,
      location: region,
      name: 'my-service',
      template: {
        spec: {
          containers: [{
            image: 'us-docker.pkg.dev/cloudrun/container/hello',
          }],
          serviceAccountName: service_account.email,
        },
      },
    });

    const policy_data = new google.dataGoogleIamPolicy.DataGoogleIamPolicy(this, 'policy_data', {
      binding: [{
        role: 'roles/run.invoker',
        members: ['allUsers'],
      }],
    });

    new google.cloudRunServiceIamPolicy.CloudRunServiceIamPolicy(this, 'cloud_run_service_policy', {
      location: region,
      policyData: policy_data.policyData,
      service: cloud_run_service.name,
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
