import { Construct } from 'constructs';
import { RestApi,
    LambdaIntegration,
    Integration,
    IntegrationType,
    AuthorizationType, //cognito integration
    CognitoUserPoolsAuthorizer,
} from 'aws-cdk-lib/aws-apigateway';
import { Runtime, Code, Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
import { UserPool } from 'aws-cdk-lib/aws-cognito';

import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';

interface ApiGatewayProps {
    projectPrefix: string;
    lambdaFunction: LambdaFunction;
    ecsLoadBalancerDns?: string;
    userPool: UserPool;
    userPoolClientId: string;   // authentication -- identification
}

export class ApiGatewayConstruct extends Construct {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ApiGatewayProps) {
    super(scope, id);

    const api = new RestApi(this, `${props.projectPrefix}-ApiGateway`, {
      restApiName: `${props.projectPrefix}-Api`,
      deployOptions: { stageName: 'prod' },
    }); //We do not use CORS yet

    // Lambda routes
    const lambdaIntegration = new LambdaIntegration(props.lambdaFunction,{ proxy: true });  //explicit proxy enabling for tests

    //Remember to add cognito bottleneck before all  other functionalities in cdk main stack
    const authorizer = new CognitoUserPoolsAuthorizer(this, `${props.projectPrefix}-Authorizer`, {
          cognitoUserPools: [props.userPool],
          authorizerName: `${props.projectPrefix}-CognitoAuthorizer`,
      });

    //explicit attach
      authorizer._attachToApi(api);

      // to support sign up, sign in
      const signUpFn = new LambdaFunction(this, `${props.projectPrefix}-AuthSignUpFn`, {
          runtime: Runtime.PYTHON_3_12,
          handler: 'auth_sign_up.lambda_handler',
          code: Code.fromAsset(path.join(__dirname, '../../lambda')), // same folder as handler.py
          environment: {
              USER_POOL_ID: props.userPool.userPoolId,
              USER_POOL_CLIENT_ID: props.userPoolClientId,
          },
          timeout: cdk.Duration.seconds(10),
          memorySize: 256,
      });

      const signInFn = new LambdaFunction(this, `${props.projectPrefix}-AuthSignInFn`, {
          runtime: Runtime.PYTHON_3_12,
          handler: 'auth_sign_in.lambda_handler',
          code: Code.fromAsset(path.join(__dirname, '../../lambda')),
          environment: {
              USER_POOL_ID: props.userPool.userPoolId,
              USER_POOL_CLIENT_ID: props.userPoolClientId,
          },
          timeout: cdk.Duration.seconds(10),
          memorySize: 256,
      });

      [signUpFn, signInFn].forEach(fn => {
          fn.addToRolePolicy(new iam.PolicyStatement({
              actions: [
                  'cognito-idp:SignUp',
                  'cognito-idp:InitiateAuth',
                  // you can add 'cognito-idp:ConfirmSignUp', 'cognito-idp:GlobalSignOut', 'cognito-idp:RevokeToken' later if you add those endpoints
              ],
              resources: ['*'], // these actions don’t support granular ARNs; '*' is typical
          }));
      });

      //add a route category: /auth
      const auth = api.root.addResource('auth');

      // /auth/signUp
      auth.addResource('signUp').addMethod(
          'POST',
          new LambdaIntegration(signUpFn),
          { authorizationType: AuthorizationType.NONE }  // public
      );

      // /auth/signIn
      auth.addResource('signIn').addMethod(
          'POST',
          new LambdaIntegration(signInFn),
          { authorizationType: AuthorizationType.NONE }  // public
      );

      // /me
      api.root.addResource('me').addMethod('GET', lambdaIntegration, {
          authorizationType: AuthorizationType.COGNITO,
          authorizer,
      });

    //for now, authorize both requests
    api.root.addResource('hello').addMethod('GET', lambdaIntegration,
        {
            authorizationType:AuthorizationType.COGNITO,
            authorizer,
            //oauchScopes: ['api/hello']    //future differentiation of restaurant owner vs regular user
        }
        );
    api.root.addResource('insert').addMethod('POST', lambdaIntegration,
        {
            authorizationType:AuthorizationType.COGNITO,
            authorizer,
        }
        );

    // ECS routes (proxy integration through ALB)
    if (props.ecsLoadBalancerDns) {
      const ecsIntegration = new Integration({
        type: IntegrationType.HTTP_PROXY,
        integrationHttpMethod: 'ANY',
        uri: `http://${props.ecsLoadBalancerDns}`,
      });

      //can add authorization for ECS commands too in the future.

      api.root.addResource('helloECS').addMethod('GET', ecsIntegration);
      api.root.addResource('insertECS').addMethod('POST', ecsIntegration);
    }

    this.apiUrl = api.url;
  }
}