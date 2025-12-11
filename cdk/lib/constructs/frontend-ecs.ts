import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import { Cluster, ContainerImage, FargateService, FargateTaskDefinition, LogDriver, AwsLogDriverMode } from 'aws-cdk-lib/aws-ecs';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { IVpc } from 'aws-cdk-lib/aws-ec2';
import { ApplicationLoadBalancer, ApplicationProtocol } from 'aws-cdk-lib/aws-elasticloadbalancingv2';

interface FrontendECSProps {
  vpc: IVpc;
  backendLoadBalancerDns: string;
  projectPrefix: string;
}

export class FrontendECSConstruct extends Construct {
  public readonly loadBalancerDns: string;

  constructor(scope: Construct, id: string, props: FrontendECSProps) {
    super(scope, id);

    const cluster = new Cluster(this, `${props.projectPrefix}-Frontend-Cluster`, {
      vpc: props.vpc,
      containerInsights: true,
    });

    const taskDef = new FargateTaskDefinition(this, `${props.projectPrefix}-Frontend-TaskDef`, {
      memoryLimitMiB: 3072, // 3GB for Next.js
      cpu: 1024, // 1 vCPU
    });

    const logGroup = new LogGroup(this, `${props.projectPrefix}-Frontend-LogGroup`, {
      retention: RetentionDays.ONE_WEEK,
    });

    const container = taskDef.addContainer(`${props.projectPrefix}-Frontend-Container`, {
      image: ContainerImage.fromAsset('./FoodTok_Frontend', {
        file: 'Dockerfile.frontend',
        platform: Platform.LINUX_AMD64,
      }),
      environment: {
        NODE_ENV: 'production',
        BACKEND_API_URL: `http://${props.backendLoadBalancerDns}/api`,
        YELP_API_KEY: `XGjtnGCXkhEW5wggLQvG18IR1bDTz6eP-Wb6cc2W9ACdxEDmNhon2vQm6SEcb1jUJAdD8Mh048Zpfp-G4DjrFBCiX4AJaQZxPqCEJWVwXok4CKwp4d-PO43sH_MkaXYx`,
      },
      logging: LogDriver.awsLogs({
        logGroup,
        streamPrefix: `${props.projectPrefix}-Frontend-Container`,
        mode: AwsLogDriverMode.NON_BLOCKING,
      }),
    });

    container.addPortMappings({ containerPort: 3000 });

    const service = new FargateService(this, `${props.projectPrefix}-Frontend-Service`, {
      cluster,
      taskDefinition: taskDef,
      desiredCount: 1,
    });

    const lb = new ApplicationLoadBalancer(this, `${props.projectPrefix}-Frontend-LB`, {
      vpc: props.vpc,
      internetFacing: true,
    });

    const listener = lb.addListener(`${props.projectPrefix}-Frontend-Listener`, {
      port: 80,
      open: true,
    });

    listener.addTargets(`${props.projectPrefix}-Frontend-Target`, {
      port: 80,
      protocol: ApplicationProtocol.HTTP,
      targets: [service],
      healthCheck: { 
        path: '/',
        interval: cdk.Duration.seconds(60),
        timeout: cdk.Duration.seconds(30),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
    });

    this.loadBalancerDns = lb.loadBalancerDnsName;
  }
}
