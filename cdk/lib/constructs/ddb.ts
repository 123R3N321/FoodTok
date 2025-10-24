import { Construct } from 'constructs';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { RemovalPolicy } from 'aws-cdk-lib';

export interface DdbProps {
  projectPrefix: string;
}

export class DdbConstruct extends Construct {
  public readonly table: Table;

  constructor(scope: Construct, id: string, props: DdbProps) {
    super(scope, id);

    this.table = new Table(this, `${props.projectPrefix}-UserTable`, {
      partitionKey: { name: 'userId', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });
  }
}
