import { Construct } from 'constructs';
import { RestApi, LambdaIntegration, Integration, IntegrationType } from 'aws-cdk-lib/aws-apigateway';
import { Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';

interface ApiGatewayProps {
  projectPrefix: string;
  lambdaFunction: LambdaFunction;
  ecsLoadBalancerDns?: string; 
}

export class ApiGatewayConstruct extends Construct {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ApiGatewayProps) {
    super(scope, id);

    const api = new RestApi(this, `${props.projectPrefix}-ApiGateway`, {
      restApiName: `${props.projectPrefix}-Api`,
      deployOptions: { stageName: 'prod' },
    });

    // Lambda routes
    const lambdaIntegration = new LambdaIntegration(props.lambdaFunction);
    api.root.addResource('hello').addMethod('GET', lambdaIntegration);
    api.root.addResource('insert').addMethod('POST', lambdaIntegration);

    // ECS routes (proxy integration through ALB)
    if (props.ecsLoadBalancerDns) {
      const ecsIntegration = new Integration({
        type: IntegrationType.HTTP_PROXY,
        integrationHttpMethod: 'ANY',
        uri: `http://${props.ecsLoadBalancerDns}`,
      });

      api.root.addResource('helloECS').addMethod('GET', ecsIntegration);
      api.root.addResource('insertECS').addMethod('POST', ecsIntegration);
    }

    this.apiUrl = api.url;
  }
}