import * as cdk from 'aws-cdk-lib' 
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { S3Construct } from './constructs/s3';
import { DdbConstruct } from './constructs/ddb';
import { LambdaConstruct } from './constructs/lambda';
import { ApiGatewayConstruct } from './constructs/api_gateway';
import { BackendECSConstruct } from './constructs/backend-ecs';
import { FrontendECSConstruct } from './constructs/frontend-ecs';
import {CognitoUserPoolsAuthorizer} from "aws-cdk-lib/aws-apigateway";
import {CognitoConstruct} from "./constructs/cognito";
import { TestRunnerConstruct } from './constructs/test_runner';

export class MainStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const projectPrefix = 'FoodTok';

    const s3 = new S3Construct(this, 'S3Construct', { projectPrefix });
    const ddb = new DdbConstruct(this, 'DdbConstruct', { projectPrefix });

    const backendEcs = new BackendECSConstruct(this, 'BackendECSConstruct', {
      users: ddb.users,
      favorites: ddb.favorites,
      reservations: ddb.reservations,
      holds: ddb.holds,
      imageBucket: s3.imageBucket,
      projectPrefix,     
    });

    const frontendEcs = new FrontendECSConstruct(this, 'FrontendECSConstruct', {
      vpc: backendEcs.vpc,
      backendLoadBalancerDns: backendEcs.loadBalancerDns,
      projectPrefix,
    });

    new cdk.CfnOutput(this, 'ECSLoadBalancerDNS', {
      value: backendEcs.loadBalancerDns,
      description: 'Public ALB endpoint for ECS Flask app',
    });

    new cdk.CfnOutput(this, 'FrontendLoadBalancerDNS', {
      value: frontendEcs.loadBalancerDns,
      exportName: `${projectPrefix}-FrontendLoadBalancerDNS`,
      description: 'Public ALB endpoint for Frontend Next.js app',
    });
    
  }
}
