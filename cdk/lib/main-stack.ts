import * as cdk from 'aws-cdk-lib' 
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { S3Construct } from './constructs/s3';
import { DdbConstruct } from './constructs/ddb';
import { LambdaConstruct } from './constructs/lambda';
import { ApiGatewayConstruct } from './constructs/api_gateway';
import { ECSConstruct } from './constructs/ecs';
import {CognitoUserPoolsAuthorizer} from "aws-cdk-lib/aws-apigateway";
import {CognitoConstruct} from "./constructs/cognito";
import { TestRunnerConstruct } from './constructs/test_runner';

export class MainStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const projectPrefix = 'FoodTok';

    const s3 = new S3Construct(this, 'S3Construct', { projectPrefix });
    const ddb = new DdbConstruct(this, 'DdbConstruct', { projectPrefix });
    const lambda = new LambdaConstruct(this, 'LambdaConstruct', {
      table: ddb.users,
      imageBucket: s3.imageBucket,
      projectPrefix,
    });

    const ecs = new ECSConstruct(this, 'ECSConstruct', {
      users: ddb.users,
      restaurants: ddb.restaurants,
      reservations: ddb.reservations,
      userPreferences: ddb.userPreferences,
      userFavoriteCuisines: ddb.userFavoriteCuisines,
      chainStores: ddb.chainStores,
      restaurantHours: ddb.restaurantHours,
      restaurantSpecialHours: ddb.restaurantSpecialHours,
      cuisines: ddb.cuisines,
      restaurantCuisines: ddb.restaurantCuisines,
      amenities: ddb.amenities,
      restaurantAmenities: ddb.restaurantAmenities,
      restaurantImages: ddb.restaurantImages,
      diningTables: ddb.diningTables,
      tableAvailability: ddb.tableAvailability,
      tableAvailabilityOverrides: ddb.tableAvailabilityOverrides,
      tableAvailabilitySnapshots: ddb.tableAvailabilitySnapshots,
      reservationTables: ddb.reservationTables,
      reservationHistory: ddb.reservationHistory,
      waitlistEntries: ddb.waitlistEntries,
      reviews: ddb.reviews,
      reviewImages: ddb.reviewImages,
      reviewResponses: ddb.reviewResponses,
      reviewHelpfulVotes: ddb.reviewHelpfulVotes,
      favorites: ddb.favorites,
      recommendationScores: ddb.recommendationScores,
      userInteractions: ddb.userInteractions,
      notifications: ddb.notifications,
      admins: ddb.admins,
      adminActivityLogs: ddb.adminActivityLogs,
      userNoShowRecords: ddb.userNoShowRecords,
      systemSettings: ddb.systemSettings,
      userStats: ddb.userStats,
      holds: ddb.holds,
      imageBucket: s3.imageBucket,
      projectPrefix,
    });

    //instantiated BEFORE api gateway
    const cognito = new CognitoConstruct(this, 'CognitoConstruct', {projectPrefix})

    const api_gateway = new ApiGatewayConstruct(this, 'ApiGatewayConstruct', {
      lambdaFunction: lambda.fn,
      ecsLoadBalancerDns: ecs.loadBalancerDns, 
      projectPrefix,
        userPool:cognito.userPool,  //pass in user pool as additional param
    });

    const testRunner = new TestRunnerConstruct(this, 'TestRunner', {
        projectPrefix,
        userPool: cognito.userPool,
        userPoolClient: cognito.userPoolClient,
        testEmail: 'testuser@example.com',      // optional
        testPassword: 'P@ssword1234',           // optional
        cleanupUser: true,                      // optional
    });

    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: api_gateway.apiUrl,
        exportName: `${projectPrefix}-ApiGatewayUrl`,
        description: 'Invoke your Lambda endpoints',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
        value: cognito.userPool.userPoolId,
        exportName: `${projectPrefix}-UserPoolId`,
        description: 'generated user pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
        value: cognito.userPoolClient.userPoolClientId,
        exportName: `${projectPrefix}-UserPoolClientId`,
          description: 'generated user pool client ID',
    });

    new cdk.CfnOutput(this, 'AwsRegion', {
        value: this.region,
        exportName: `${projectPrefix}-Region`,
          description: "should be us-east-1 by default, but verbosity helps debug"
    });

    new cdk.CfnOutput(this, 'ECSLoadBalancerDNS', {
      value: ecs.loadBalancerDns,
      description: 'Public ALB endpoint for ECS Flask app',
    });

    new cdk.CfnOutput(this, 'WebsiteBucketURL', {
      value: s3.websiteBucket.bucketWebsiteUrl,
      description: 'S3 Website Bucket URL',
    });

      //just for makefile use
    new cdk.CfnOutput(this, 'TestRunnerFnName', {
        value: testRunner.fn.functionName,
        exportName: `${projectPrefix}-TestRunnerFnName`,
    });
    
  }
}
