import { Construct } from 'constructs';
import * as path from 'path';
import {
    Duration,
    RemovalPolicy,
} from 'aws-cdk-lib';
import {
    Table,
    AttributeType,
    BillingMode,
    ProjectionType,
} from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export interface UserConstructProps {
    projectPrefix: string;
    userPool: cognito.UserPool;
    /**
     * Add a GSI to look up by preferred_username.
     * Only turn this on if you need query-by-handle.
     */
    addUsernameGsi?: boolean;
}

export class UserConstruct extends Construct {
    public readonly table: Table;
    public readonly postConfirmFn: lambda.Function;

    constructor(scope: Construct, id: string, props: UserConstructProps) {
        super(scope, id);

        // DynamoDB Users table
        this.table = new Table(this, `${props.projectPrefix}-Users`, {
            tableName: `${props.projectPrefix}-Users`,
            partitionKey: { name: 'userId', type: AttributeType.STRING }, // Cognito sub
            billingMode: BillingMode.PAY_PER_REQUEST,
            pointInTimeRecovery: true,
            removalPolicy: RemovalPolicy.DESTROY, // keep user data safe in prod
        });

        if (props.addUsernameGsi) {
            this.table.addGlobalSecondaryIndex({
                indexName: 'GSI1-PreferredUsername',
                partitionKey: { name: 'preferred_username', type: AttributeType.STRING },
                sortKey: { name: 'createdAt', type: AttributeType.STRING },
                projectionType: ProjectionType.ALL,
            });
        }

        // Post-confirmation Lambda — creates the initial user row
        this.postConfirmFn = new lambda.Function(this, `${props.projectPrefix}-PostConfirmFn`, {
            runtime: lambda.Runtime.PYTHON_3_12,
            handler: 'post_confirmation.lambda_handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda')),
            timeout: Duration.seconds(10),
            memorySize: 256,
            environment: {
                USER_TABLE_NAME: this.table.tableName,
                DEFAULT_ROLE: 'user',
            },
            description: 'Create/initialize a Users table item after Cognito signup confirmation',
        });

        // Least-privilege write access
        this.table.grantWriteData(this.postConfirmFn);

        // Attach to Cognito User Pool as a Post Confirmation trigger
        props.userPool.addTrigger(
            cognito.UserPoolOperation.POST_CONFIRMATION,
            this.postConfirmFn
        );
    }
}
