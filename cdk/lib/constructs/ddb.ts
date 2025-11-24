import { Construct } from 'constructs';
import { Table, AttributeType, BillingMode, ProjectionType } from 'aws-cdk-lib/aws-dynamodb';
import { RemovalPolicy } from 'aws-cdk-lib';

export interface DdbProps {
  projectPrefix: string;
}

export class DdbConstruct extends Construct {
  public readonly users: Table;
  public readonly restaurants: Table;
  public readonly reservations: Table;
  public readonly userPreferences: Table;
  public readonly userFavoriteCuisines: Table;
  public readonly chainStores: Table;
  public readonly restaurantHours: Table;
  public readonly restaurantSpecialHours: Table;
  public readonly cuisines: Table;
  public readonly restaurantCuisines: Table;
  public readonly amenities: Table;
  public readonly restaurantAmenities: Table;
  public readonly restaurantImages: Table;
  public readonly diningTables: Table;
  public readonly tableAvailability: Table;
  public readonly tableAvailabilityOverrides: Table;
  public readonly tableAvailabilitySnapshots: Table;
  public readonly reservationTables: Table;
  public readonly reservationHistory: Table;
  public readonly waitlistEntries: Table;
  public readonly reviews: Table;
  public readonly reviewImages: Table;
  public readonly reviewResponses: Table;
  public readonly reviewHelpfulVotes: Table;
  public readonly favorites: Table;
  public readonly recommendationScores: Table;
  public readonly userInteractions: Table;
  public readonly notifications: Table;
  public readonly admins: Table;
  public readonly adminActivityLogs: Table;
  public readonly userNoShowRecords: Table;
  public readonly systemSettings: Table;
  public readonly userStats: Table;
  public readonly holds: Table;

  constructor(scope: Construct, id: string, props: DdbProps) {
    super(scope, id);

    // ------------------------------
    // Users Table
    // ------------------------------
    this.users = new Table(this, `${props.projectPrefix}-Users`, {
      tableName: `${props.projectPrefix}-Users`,
      partitionKey: { name: 'userId', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // ------------------------------
    // Restaurants Table
    // ------------------------------
    this.restaurants = new Table(this, `${props.projectPrefix}-Restaurants`, {
      tableName: `${props.projectPrefix}-Restaurants`,
      partitionKey: { name: 'restaurantId', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.restaurants.addGlobalSecondaryIndex({
      indexName: "slug-index",
      partitionKey: { name: "slug", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    this.restaurants.addGlobalSecondaryIndex({
      indexName: "city-state-index",
      partitionKey: { name: "city", type: AttributeType.STRING },
      sortKey: { name: "state", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    this.restaurants.addGlobalSecondaryIndex({
      indexName: "active-index",
      partitionKey: { name: "isActive", type: AttributeType.STRING },
      sortKey: { name: "acceptsReservations", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    // ------------------------------
    // Reservations Table
    // ------------------------------
    this.reservations = new Table(this, `${props.projectPrefix}-Reservations`, {
      tableName: `${props.projectPrefix}-Reservations`,
      partitionKey: { name: "reservationId", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.reservations.addGlobalSecondaryIndex({
      indexName: "userId-dts-index",
      partitionKey: { name: "userId", type: AttributeType.STRING },
      sortKey: { name: "dateTimeStatus", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    this.reservations.addGlobalSecondaryIndex({
      indexName: "restaurantId-dts-index",
      partitionKey: { name: "restaurantId", type: AttributeType.STRING },
      sortKey: { name: "dateTimeStatus", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    // ------------------------------
    // UserPreferences Table
    // ------------------------------
    this.userPreferences = new Table(this,`${props.projectPrefix}-UserPreferences`,{
      tableName: `${props.projectPrefix}-UserPreferences`,
      partitionKey: { name: "userId", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // ------------------------------
    // UserFavoriteCuisines Table
    // ------------------------------
    this.userFavoriteCuisines = new Table(this,`${props.projectPrefix}-UserFavoriteCuisines`, {
      tableName: `${props.projectPrefix}-UserFavoriteCuisines`,
      partitionKey: { name: "userId", type: AttributeType.STRING },
      sortKey: { name: "cuisineId", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // ------------------------------
    // ChainStores Table
    // ------------------------------
    this.chainStores = new Table(this, `${props.projectPrefix}-ChainStores`, {
      tableName: `${props.projectPrefix}-ChainStores`,
      partitionKey: { name: "chainId", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });


    // ------------------------------
    // RestaurantHours Table
    // ------------------------------
    this.restaurantHours = new Table(this, `${props.projectPrefix}-RestaurantHours`, {
      tableName: `${props.projectPrefix}-RestaurantHours`,
      partitionKey: { name: "restaurantId", type: AttributeType.STRING },
      sortKey: { name: "dayOfWeek", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // ------------------------------
    // RestaurantSpecialHours Table
    // ------------------------------
    this.restaurantSpecialHours = new Table(this, `${props.projectPrefix}-RestaurantSpecialHours`, {
      tableName: `${props.projectPrefix}-RestaurantSpecialHours`,
      partitionKey: { name: "restaurantId", type: AttributeType.STRING },
      sortKey: { name: "date", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // ------------------------------
    // Cuisines Table
    // ------------------------------
    this.cuisines = new Table(this, `${props.projectPrefix}-Cuisines`, {
      tableName: `${props.projectPrefix}-Cuisines`,
      partitionKey: { name: "cuisineId", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.cuisines.addGlobalSecondaryIndex({
      indexName: "slug-index",
      partitionKey: { name: "slug", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    // ------------------------------
    // RestaurantCuisines Table
    // ------------------------------
    this.restaurantCuisines = new Table(this, `${props.projectPrefix}-RestaurantCuisines`, {
      tableName: `${props.projectPrefix}-RestaurantCuisines`,
      partitionKey: { name: "restaurantId", type: AttributeType.STRING },
      sortKey: { name: "cuisineId", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.restaurantCuisines.addGlobalSecondaryIndex({
      indexName: "cuisineId-index",
      partitionKey: { name: "cuisineId", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    // ------------------------------
    // Amenities Table
    // ------------------------------
    this.amenities = new Table(this, `${props.projectPrefix}-Amenities`, {
      tableName: `${props.projectPrefix}-Amenities`,
      partitionKey: { name: "amenityId", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.amenities.addGlobalSecondaryIndex({
      indexName: "slug-index",
      partitionKey: { name: "slug", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    // ------------------------------
    // RestaurantAmenities Table
    // ------------------------------
    this.restaurantAmenities = new Table(this, `${props.projectPrefix}-RestaurantAmenities`, {
      tableName: `${props.projectPrefix}-RestaurantAmenities`,
      partitionKey: { name: "restaurantId", type: AttributeType.STRING },
      sortKey: { name: "amenityId", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.restaurantAmenities.addGlobalSecondaryIndex({
      indexName: "amenityId-index",
      partitionKey: { name: "amenityId", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });


    // ------------------------------
    // RestaurantImages Table
    // ------------------------------
    this.restaurantImages = new Table(this, `${props.projectPrefix}-RestaurantImages`, {
      tableName: `${props.projectPrefix}-RestaurantImages`,
      partitionKey: { name: "imageId", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.restaurantImages.addGlobalSecondaryIndex({
      indexName: "restaurantId-index",
      partitionKey: { name: "restaurantId", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    // ------------------------------
    // DiningTables Table
    // ------------------------------
    this.diningTables = new Table(this, `${props.projectPrefix}-DiningTables`, {
      tableName: `${props.projectPrefix}-DiningTables`,
      partitionKey: { name: "tableId", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.diningTables.addGlobalSecondaryIndex({
      indexName: "restaurantId-index",
      partitionKey: { name: "restaurantId", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    // ------------------------------
    // TableAvailability Table
    // ------------------------------
    this.tableAvailability = new Table(this, `${props.projectPrefix}-TableAvailability`, {
      tableName: `${props.projectPrefix}-TableAvailability`,
      partitionKey: { name: "restaurantId", type: AttributeType.STRING },
      sortKey: { name: "dayOfWeek", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // ------------------------------
    // TableAvailabilityOverrides Table
    // ------------------------------
    this.tableAvailabilityOverrides = new Table(this, `${props.projectPrefix}-TableAvailabilityOverrides`, {
      tableName: `${props.projectPrefix}-TableAvailabilityOverrides`,
      partitionKey: { name: "restaurantId", type: AttributeType.STRING },
      sortKey: { name: "date", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // ------------------------------
    // TableAvailabilitySnapshots Table
    // ------------------------------
    this.tableAvailabilitySnapshots = new Table(this, `${props.projectPrefix}-TableAvailabilitySnapshots`, {
      tableName: `${props.projectPrefix}-TableAvailabilitySnapshots`,
      partitionKey: { name: "restaurantId", type: AttributeType.STRING },
      sortKey: { name: "date", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // ------------------------------
    // ReservationTables Table
    // ------------------------------
    this.reservationTables = new Table(this, `${props.projectPrefix}-ReservationTables`, {
      tableName: `${props.projectPrefix}-ReservationTables`,
      partitionKey: { name: "reservationId", type: AttributeType.STRING },
      sortKey: { name: "tableId", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // ------------------------------
    // ReservationHistory Table
    // ------------------------------
    this.reservationHistory = new Table(this, `${props.projectPrefix}-ReservationHistory`, {
      tableName: `${props.projectPrefix}-ReservationHistory`,
      partitionKey: { name: "historyId", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.reservationHistory.addGlobalSecondaryIndex({
      indexName: "reservationId-index",
      partitionKey: { name: "reservationId", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    // ------------------------------
    // WaitlistEntries Table
    // ------------------------------
    this.waitlistEntries = new Table(this, `${props.projectPrefix}-WaitlistEntries`, {
      tableName: `${props.projectPrefix}-WaitlistEntries`,
      partitionKey: { name: "waitlistId", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.waitlistEntries.addGlobalSecondaryIndex({
      indexName: "restaurantId-index",
      partitionKey: { name: "restaurantId", type: AttributeType.STRING },
      sortKey: { name: "requestedDate", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    this.waitlistEntries.addGlobalSecondaryIndex({
      indexName: "userId-index",
      partitionKey: { name: "userId", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    this.waitlistEntries.addGlobalSecondaryIndex({
      indexName: "status-index",
      partitionKey: { name: "status", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    // ------------------------------
    // Reviews Table
    // ------------------------------
    this.reviews = new Table(this, `${props.projectPrefix}-Reviews`, {
      tableName: `${props.projectPrefix}-Reviews`,
      partitionKey: { name: "reviewId", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.reviews.addGlobalSecondaryIndex({
      indexName: "restaurantId-index",
      partitionKey: { name: "restaurantId", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    this.reviews.addGlobalSecondaryIndex({
      indexName: "userId-index",
      partitionKey: { name: "userId", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    this.reviews.addGlobalSecondaryIndex({
      indexName: "reservationId-index",
      partitionKey: { name: "reservationId", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    // ------------------------------
    // ReviewImages Table
    // ------------------------------
    this.reviewImages = new Table(this, `${props.projectPrefix}-ReviewImages`, {
      tableName: `${props.projectPrefix}-ReviewImages`,
      partitionKey: { name: "imageId", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.reviewImages.addGlobalSecondaryIndex({
      indexName: "reviewId-index",
      partitionKey: { name: "reviewId", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });


    // ------------------------------
    // ReviewResponses Table
    // ------------------------------
    this.reviewResponses = new Table(this, `${props.projectPrefix}-ReviewResponses`, {
      tableName: `${props.projectPrefix}-ReviewResponses`,
      partitionKey: { name: "reviewId", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // ------------------------------
    // ReviewHelpfulVotes Table
    // ------------------------------
    this.reviewHelpfulVotes = new Table(this, `${props.projectPrefix}-ReviewHelpfulVotes`, {
      tableName: `${props.projectPrefix}-ReviewHelpfulVotes`,
      partitionKey: { name: "reviewId", type: AttributeType.STRING },
      sortKey: { name: "userId", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // ------------------------------
    // Favorites Table
    // ------------------------------
    this.favorites = new Table(this, `${props.projectPrefix}-Favorites`, {
      tableName: `${props.projectPrefix}-Favorites`,
      partitionKey: { name: "userId", type: AttributeType.STRING },
      sortKey: { name: "restaurantId", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.favorites.addGlobalSecondaryIndex({
      indexName: "restaurantId-index",
      partitionKey: { name: "restaurantId", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    // ------------------------------
    // RecommendationScores Table
    // ------------------------------
    this.recommendationScores = new Table(this, `${props.projectPrefix}-RecommendationScores`, {
      tableName: `${props.projectPrefix}-RecommendationScores`,
      partitionKey: { name: "userId", type: AttributeType.STRING },
      sortKey: { name: "restaurantId", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.recommendationScores.addGlobalSecondaryIndex({
      indexName: "restaurantId-index",
      partitionKey: { name: "restaurantId", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    this.recommendationScores.addGlobalSecondaryIndex({
      indexName: "score-index",
      partitionKey: { name: "userId", type: AttributeType.STRING },
      sortKey: { name: "overallScore", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    // ------------------------------
    // UserInteractions Table
    // ------------------------------
    this.userInteractions = new Table(this, `${props.projectPrefix}-UserInteractions`, {
      tableName: `${props.projectPrefix}-UserInteractions`,
      partitionKey: { name: "interactionId", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.userInteractions.addGlobalSecondaryIndex({
      indexName: "userId-index",
      partitionKey: { name: "userId", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    this.userInteractions.addGlobalSecondaryIndex({
      indexName: "restaurantId-index",
      partitionKey: { name: "restaurantId", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    this.userInteractions.addGlobalSecondaryIndex({
      indexName: "type-index",
      partitionKey: { name: "interactionType", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    // ------------------------------
    // Notifications Table
    // ------------------------------
    this.notifications = new Table(this, `${props.projectPrefix}-Notifications`, {
      tableName: `${props.projectPrefix}-Notifications`,
      partitionKey: { name: "notificationId", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.notifications.addGlobalSecondaryIndex({
      indexName: "userId-index",
      partitionKey: { name: "userId", type: AttributeType.STRING },
      sortKey: { name: "createdAt", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    this.notifications.addGlobalSecondaryIndex({
      indexName: "read-index",
      partitionKey: { name: "userId", type: AttributeType.STRING },
      sortKey: { name: "isRead", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });


    // ------------------------------
    // Admins Table
    // ------------------------------
    this.admins = new Table(this, `${props.projectPrefix}-Admins`, {
      tableName: `${props.projectPrefix}-Admins`,
      partitionKey: { name: "adminId", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.admins.addGlobalSecondaryIndex({
      indexName: "email-index",
      partitionKey: { name: "email", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    // ------------------------------
    // AdminActivityLogs Table
    // ------------------------------
    this.adminActivityLogs = new Table(this, `${props.projectPrefix}-AdminActivityLogs`, {
      tableName: `${props.projectPrefix}-AdminActivityLogs`,
      partitionKey: { name: "logId", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.adminActivityLogs.addGlobalSecondaryIndex({
      indexName: "adminId-index",
      partitionKey: { name: "adminId", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    this.adminActivityLogs.addGlobalSecondaryIndex({
      indexName: "entity-index",
      partitionKey: { name: "entityType", type: AttributeType.STRING },
      sortKey: { name: "entityId", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    // ------------------------------
    // UserNoShowRecords Table
    // ------------------------------
    this.userNoShowRecords = new Table(this, `${props.projectPrefix}-UserNoShowRecords`, {
      tableName: `${props.projectPrefix}-UserNoShowRecords`,
      partitionKey: { name: "recordId", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.userNoShowRecords.addGlobalSecondaryIndex({
      indexName: "userId-index",
      partitionKey: { name: "userId", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    this.userNoShowRecords.addGlobalSecondaryIndex({
      indexName: "restaurantId-index",
      partitionKey: { name: "restaurantId", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    // ------------------------------
    // SystemSettings Table
    // ------------------------------
    this.systemSettings = new Table(this, `${props.projectPrefix}-SystemSettings`, {
      tableName: `${props.projectPrefix}-SystemSettings`,
      partitionKey: { name: "settingKey", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.userStats = new Table(this, `${props.projectPrefix}-UserStats`, {
      tableName: `${props.projectPrefix}-UserStats`,
      partitionKey: { name: "userId", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.holds = new Table(this, `${props.projectPrefix}-Holds`, {
      tableName: `${props.projectPrefix}-Holds`,
      partitionKey: { name: "holdId", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });


    // Build additonal tables as needed using the structure above
  }
}
