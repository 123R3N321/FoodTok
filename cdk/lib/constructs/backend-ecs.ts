import { Construct } from 'constructs';
import { Cluster, ContainerImage, FargateService, FargateTaskDefinition, LogDriver, AwsLogDriverMode } from 'aws-cdk-lib/aws-ecs';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { ApplicationLoadBalancer, ApplicationProtocol } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Bucket } from 'aws-cdk-lib/aws-s3';

interface BackendECSProps {
  users: Table;
  restaurants: Table;
  favorites: Table;
  reservations: Table;
  userStats: Table;
  holds: Table;
  imageBucket: Bucket;
  projectPrefix: string; 
}

export class BackendECSConstruct extends Construct {
  public readonly loadBalancerDns: string;
  public readonly vpc: Vpc;

  constructor(scope: Construct, id: string, props: BackendECSProps) {
    super(scope, id);

    const vpc = new Vpc(this, `${props.projectPrefix}-Vpc`, { maxAzs: 2 });
    this.vpc = vpc;

    const cluster = new Cluster(this, `${props.projectPrefix}-Cluster`, {
      vpc,
      containerInsights: true,
    });

    const taskDef = new FargateTaskDefinition(this, `${props.projectPrefix}-TaskDef`, {
      memoryLimitMiB: 512,
      cpu: 256,
    });

    const logGroup = new LogGroup(this, `${props.projectPrefix}-EcsLogGroup`, {
      retention: RetentionDays.ONE_WEEK,
    });

    const container = taskDef.addContainer(`${props.projectPrefix}-Container`, {
      image: ContainerImage.fromAsset('./ecs_app', {
        file: 'Dockerfile.backend',
        platform: Platform.LINUX_AMD64,
      }), 
      environment: {
        DDB_USERS_TABLE: props.users.tableName,
        DDB_RESTAURANTS_TABLE: props.restaurants.tableName,
        DDB_FAVORITES_TABLE: props.favorites.tableName,
        DDB_RESERVATIONS_TABLE: props.reservations.tableName,
        DDB_USER_STATS_TABLE:  props.userStats.tableName,
        DDB_HOLDS_TABLE: props.holds.tableName,      
        AWS_REGION: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
        IS_LOCAL: 'false',
        S3_IMAGE_BUCKET: props.imageBucket.bucketName,
        DJANGO_SETTINGS_MODULE: 'ecs_project.settings'
      },
      logging: LogDriver.awsLogs({
        logGroup,
        streamPrefix: `${props.projectPrefix}-EcsContainer`,
        mode: AwsLogDriverMode.NON_BLOCKING,
      }),
    });

    container.addPortMappings({ containerPort: 8080 });

    const service = new FargateService(this, `${props.projectPrefix}-Service`, {
      cluster,
      taskDefinition: taskDef,
      desiredCount: 1,
    });

    const lb = new ApplicationLoadBalancer(this, `${props.projectPrefix}-LB`, {
      vpc,
      internetFacing: true,
    });

    const listener = lb.addListener(`${props.projectPrefix}-Listener`, {
      port: 80,
      open: true,
    });

    listener.addTargets(`${props.projectPrefix}-Target`, {
      port: 80,
      protocol: ApplicationProtocol.HTTP,
      targets: [service],
      healthCheck: { path: '/api/helloECS' },
    });

    // Grant ECS Task IAM permissions
    props.users.grantReadWriteData(taskDef.taskRole);
    props.restaurants.grantReadWriteData(taskDef.taskRole);
    props.favorites.grantReadWriteData(taskDef.taskRole);
    props.reservations.grantReadWriteData(taskDef.taskRole);
    props.userStats.grantReadWriteData(taskDef.taskRole);
    props.holds.grantReadWriteData(taskDef.taskRole);

    props.imageBucket.grantReadWrite(taskDef.taskRole);

    this.loadBalancerDns = lb.loadBalancerDnsName;
  }
}
