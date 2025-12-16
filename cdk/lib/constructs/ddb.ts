import { Construct } from 'constructs';
import { Table, AttributeType, BillingMode, ProjectionType } from 'aws-cdk-lib/aws-dynamodb';
import { RemovalPolicy } from 'aws-cdk-lib';

export interface DdbProps {
  projectPrefix: string;
}

export class DdbConstruct extends Construct {
  public readonly users: Table;
  public readonly favorites: Table;
  public readonly reservations: Table;
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
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // ------------------------------
    // Favorites Table
    // ------------------------------
    this.favorites = new Table(this, `${props.projectPrefix}-Favorites`, {
      tableName: `${props.projectPrefix}-Favorites`,
      partitionKey: { name: "userId", type: AttributeType.STRING },
      sortKey: { name: "restaurantId", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // ------------------------------
    // Reservations Table
    // ------------------------------
    this.reservations = new Table(this, `${props.projectPrefix}-Reservations`, {
      tableName: `${props.projectPrefix}-Reservations`,
      partitionKey: { name: "reservationId", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.reservations.addGlobalSecondaryIndex({
      indexName: "UserReservations",
      partitionKey: { name: "userId", type: AttributeType.STRING },
      sortKey: { name: "date", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    // ------------------------------
    // Holds Table
    // ------------------------------
    this.holds = new Table(this, `${props.projectPrefix}-Holds`, {
      tableName: `${props.projectPrefix}-Holds`,
      partitionKey: { name: "holdId", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
    });
  }
}