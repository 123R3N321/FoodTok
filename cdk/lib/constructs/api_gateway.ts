import { Construct } from 'constructs';
import { RestApi,
    LambdaIntegration,
    Integration,
    IntegrationType,
    AuthorizationType, //cognito integration
    CognitoUserPoolsAuthorizer,
} from 'aws-cdk-lib/aws-apigateway';
import { Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
import { UserPool } from 'aws-cdk-lib/aws-cognito';

interface ApiGatewayProps {
  projectPrefix: string;
  lambdaFunction: LambdaFunction;
  ecsLoadBalancerDns?: string;
  userPool: UserPool;
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