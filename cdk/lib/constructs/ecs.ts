import { Construct } from 'constructs';
import { Cluster, ContainerImage, FargateService, FargateTaskDefinition, LogDriver, AwsLogDriverMode } from 'aws-cdk-lib/aws-ecs';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { ApplicationLoadBalancer, ApplicationProtocol } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Bucket } from 'aws-cdk-lib/aws-s3';

interface ECSProps {
  users: Table;
  restaurants: Table;
  reservations: Table;
  userPreferences: Table;
  userFavoriteCuisines: Table;
  chainStores: Table;
  restaurantHours: Table;
  restaurantSpecialHours: Table;
  cuisines: Table;
  restaurantCuisines: Table;
  amenities: Table;
  restaurantAmenities: Table;
  restaurantImages: Table;
  diningTables: Table;
  tableAvailability: Table;
  tableAvailabilityOverrides: Table;
  tableAvailabilitySnapshots: Table;
  reservationTables: Table;
  reservationHistory: Table;
  waitlistEntries: Table;
  reviews: Table;
  reviewImages: Table;
  reviewResponses: Table;
  reviewHelpfulVotes: Table;
  favorites: Table;
  recommendationScores: Table;
  userInteractions: Table;
  notifications: Table;
  admins: Table;
  adminActivityLogs: Table;
  userNoShowRecords: Table;
  systemSettings: Table;
  userStats: Table;
  holds: Table;  
  imageBucket: Bucket;
  projectPrefix: string;
}

export class ECSConstruct extends Construct {
  public readonly loadBalancerDns: string;

  constructor(scope: Construct, id: string, props: ECSProps) {
    super(scope, id);

    const vpc = new Vpc(this, `${props.projectPrefix}-Vpc`, { maxAzs: 2 });

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
        file: 'Dockerfile.ecs',
        platform: Platform.LINUX_AMD64,
      }), 
      environment: {
        DDB_USERS_TABLE: props.users.tableName,
        DDB_RESTAURANTS_TABLE: props.restaurants.tableName,
        DDB_RESERVATIONS_TABLE: props.reservations.tableName,
        DDB_USER_PREFERENCES_TABLE: props.userPreferences.tableName,
        DDB_USER_FAVORITE_CUISINES_TABLE: props.userFavoriteCuisines.tableName,
        DDB_CHAIN_STORES_TABLE: props.chainStores.tableName,
        DDB_RESTAURANT_HOURS_TABLE: props.restaurantHours.tableName,
        DDB_RESTAURANT_SPECIAL_HOURS_TABLE: props.restaurantSpecialHours.tableName,
        DDB_CUISINES_TABLE: props.cuisines.tableName,
        DDB_RESTAURANT_CUISINES_TABLE: props.restaurantCuisines.tableName,
        DDB_AMENITIES_TABLE: props.amenities.tableName,
        DDB_RESTAURANT_AMENITIES_TABLE: props.restaurantAmenities.tableName,
        DDB_RESTAURANT_IMAGES_TABLE: props.restaurantImages.tableName,
        DDB_DINING_TABLES_TABLE: props.diningTables.tableName,
        DDB_TABLE_AVAILABILITY_TABLE: props.tableAvailability.tableName,
        DDB_TABLE_AVAILABILITY_OVERRIDES_TABLE: props.tableAvailabilityOverrides.tableName,
        DDB_TABLE_AVAILABILITY_SNAPSHOTS_TABLE: props.tableAvailabilitySnapshots.tableName,
        DDB_RESERVATION_TABLES_TABLE: props.reservationTables.tableName,
        DDB_RESERVATION_HISTORY_TABLE: props.reservationHistory.tableName,
        DDB_WAITLIST_ENTRIES_TABLE: props.waitlistEntries.tableName,
        DDB_REVIEWS_TABLE: props.reviews.tableName,
        DDB_REVIEW_IMAGES_TABLE: props.reviewImages.tableName,
        DDB_REVIEW_RESPONSES_TABLE: props.reviewResponses.tableName,
        DDB_REVIEW_HELPFUL_VOTES_TABLE: props.reviewHelpfulVotes.tableName,
        DDB_FAVORITES_TABLE: props.favorites.tableName,
        DDB_RECOMMENDATION_SCORES_TABLE: props.recommendationScores.tableName,
        DDB_USER_INTERACTIONS_TABLE: props.userInteractions.tableName,
        DDB_NOTIFICATIONS_TABLE: props.notifications.tableName,
        DDB_ADMINS_TABLE: props.admins.tableName,
        DDB_ADMIN_ACTIVITY_LOGS_TABLE: props.adminActivityLogs.tableName,
        DDB_USER_NO_SHOW_RECORDS_TABLE: props.userNoShowRecords.tableName,
        DDB_SYSTEM_SETTINGS_TABLE: props.systemSettings.tableName,
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
    props.reservations.grantReadWriteData(taskDef.taskRole);
    props.userPreferences.grantReadWriteData(taskDef.taskRole);
    props.userFavoriteCuisines.grantReadWriteData(taskDef.taskRole);
    props.chainStores.grantReadWriteData(taskDef.taskRole);
    props.restaurantHours.grantReadWriteData(taskDef.taskRole);
    props.restaurantSpecialHours.grantReadWriteData(taskDef.taskRole);
    props.cuisines.grantReadWriteData(taskDef.taskRole);
    props.restaurantCuisines.grantReadWriteData(taskDef.taskRole);
    props.amenities.grantReadWriteData(taskDef.taskRole);
    props.restaurantAmenities.grantReadWriteData(taskDef.taskRole);
    props.restaurantImages.grantReadWriteData(taskDef.taskRole);
    props.diningTables.grantReadWriteData(taskDef.taskRole);
    props.tableAvailability.grantReadWriteData(taskDef.taskRole);
    props.tableAvailabilityOverrides.grantReadWriteData(taskDef.taskRole);
    props.tableAvailabilitySnapshots.grantReadWriteData(taskDef.taskRole);
    props.reservationTables.grantReadWriteData(taskDef.taskRole);
    props.reservationHistory.grantReadWriteData(taskDef.taskRole);
    props.waitlistEntries.grantReadWriteData(taskDef.taskRole);
    props.reviews.grantReadWriteData(taskDef.taskRole);
    props.reviewImages.grantReadWriteData(taskDef.taskRole);
    props.reviewResponses.grantReadWriteData(taskDef.taskRole);
    props.reviewHelpfulVotes.grantReadWriteData(taskDef.taskRole);
    props.favorites.grantReadWriteData(taskDef.taskRole);
    props.recommendationScores.grantReadWriteData(taskDef.taskRole);
    props.userInteractions.grantReadWriteData(taskDef.taskRole);
    props.notifications.grantReadWriteData(taskDef.taskRole);
    props.admins.grantReadWriteData(taskDef.taskRole);
    props.adminActivityLogs.grantReadWriteData(taskDef.taskRole);
    props.userNoShowRecords.grantReadWriteData(taskDef.taskRole);
    props.systemSettings.grantReadWriteData(taskDef.taskRole);
    props.userStats.grantReadWriteData(taskDef.taskRole);
    props.holds.grantReadWriteData(taskDef.taskRole);
    
    props.imageBucket.grantReadWrite(taskDef.taskRole);

    this.loadBalancerDns = lb.loadBalancerDnsName;
  }
}
