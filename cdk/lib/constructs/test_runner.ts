import { Construct } from 'constructs';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { Duration } from 'aws-cdk-lib';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { join } from 'path';

interface TestRunnerProps {
    projectPrefix: string;
    userPool: UserPool;
    userPoolClient: UserPoolClient;
    testEmail?: string;
    testPassword?: string;
    cleanupUser?: boolean; // default true
}

export class TestRunnerConstruct extends Construct {
    public readonly fn: Function;

    constructor(scope: Construct, id: string, props: TestRunnerProps) {
        super(scope, id);

        this.fn = new Function(this, `${props.projectPrefix}-TestRunner`, {
            runtime: Runtime.PYTHON_3_12,
            handler: 'test_e2e_runner.lambda_handler',
            code: Code.fromAsset(join(__dirname, '../../lambda')),
            timeout: Duration.minutes(2),
            environment: {
                PROJECT_PREFIX: props.projectPrefix,
                TEST_EMAIL: props.testEmail ?? 'testuser@example.com',
                TEST_PASSWORD: props.testPassword ?? 'P@ssword1234',
                CLEANUP_USER: props.cleanupUser === false ? 'false' : 'true',
            },
        });

        // Permissions: CloudFormation list exports
        this.fn.addToRolePolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['cloudformation:ListExports'],
            resources: ['*'],
        }));

        // Cognito admin ops on this pool
        this.fn.addToRolePolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                'cognito-idp:AdminCreateUser',
                'cognito-idp:AdminSetUserPassword',
                'cognito-idp:AdminDeleteUser',
            ],
            resources: [props.userPool.userPoolArn],
        }));

        // InitiateAuth on the client (permission uses client ARN pattern)
        // Note: userPoolClientArn is available on newer CDK; otherwise allow on "*"
        const clientArn = `arn:${process.env.CDK_DEFAULT_REGION ? 'aws' : 'aws'}:cognito-idp:${scope.node.tryGetContext('aws:region') ?? process.env.CDK_DEFAULT_REGION ?? process.env.AWS_REGION}:*:userpool/${props.userPool.userPoolId}`;
        // SDK doesn't expose a strict client ARN; use wildcard on pool resource + action is acceptable:
        this.fn.addToRolePolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['cognito-idp:InitiateAuth'],
            resources: ['*'],
            // If you want to further scope down, you can add a Condition on "cognito-idp:AppClientId"
            // conditions: { StringEquals: { 'cognito-idp:AppClientId': props.userPoolClient.userPoolClientId } },
        }));
    }
}
