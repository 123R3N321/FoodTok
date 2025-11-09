import { Construct } from 'constructs';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { RemovalPolicy } from 'aws-cdk-lib';

export interface DdbProps {
  projectPrefix: string;
}

export class DdbConstruct extends Construct {
  public readonly users: Table;
  public readonly restaurants: Table;

  constructor(scope: Construct, id: string, props: DdbProps) {
    super(scope, id);

    this.users = new Table(this, `${props.projectPrefix}-Users`, {
      partitionKey: { name: 'userId', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.restaurants = new Table(this, `${props.projectPrefix}-Restaurants`, {
      partitionKey: { name: 'id', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Build additonal tables as needed using the structure above
  }
}
