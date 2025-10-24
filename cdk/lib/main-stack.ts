import * as cdk from 'aws-cdk-lib' 
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { S3Construct } from './constructs/s3';
import { DdbConstruct } from './constructs/ddb';
import { LambdaConstruct } from './constructs/lambda';
import { ApiGatewayConstruct } from './constructs/api_gateway';
import { ECSConstruct } from './constructs/ecs';

export class MainStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const projectPrefix = 'FoodTok';

    const s3 = new S3Construct(this, 'S3Construct', { projectPrefix });
    const ddb = new DdbConstruct(this, 'DdbConstruct', { projectPrefix });
    const lambda = new LambdaConstruct(this, 'LambdaConstruct', {
      table: ddb.table,
      imageBucket: s3.imageBucket,
      projectPrefix,
    });

    const ecs = new ECSConstruct(this, 'ECSConstruct', {
      table: ddb.table,
      imageBucket: s3.imageBucket,
      projectPrefix,
    });

    const api_gateway = new ApiGatewayConstruct(this, 'ApiGatewayConstruct', {
      lambdaFunction: lambda.fn,
      ecsLoadBalancerDns: ecs.loadBalancerDns, 
      projectPrefix,
    });

    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: api_gateway.apiUrl,
      description: 'Invoke your Lambda endpoints',
    });

    new cdk.CfnOutput(this, 'ECSLoadBalancerDNS', {
      value: ecs.loadBalancerDns,
      description: 'Public ALB endpoint for ECS Flask app',
    });

    new cdk.CfnOutput(this, 'WebsiteBucketURL', {
      value: s3.websiteBucket.bucketWebsiteUrl,
      description: 'S3 Website Bucket URL',
    });

    new cdk.CfnOutput(this, 'ImageBucketName', {
      value: s3.imageBucket.bucketName,
      description: 'S3 Image Bucket Name',
    });

    new cdk.CfnOutput(this, 'DynamoDBTableName', {
      value: ddb.table.tableName,
      description: 'DynamoDB Table Name',
    });
    
  }
}
