import { Construct } from 'constructs';
import { UserPool, UserPoolClient, OAuthScope, AccountRecovery } from 'aws-cdk-lib/aws-cognito';

interface CognitoProps {
    projectPrefix: string;
    // Optional: add callback/logout URLs if you’ll use Hosted UI / auth code flow
    callbackUrls?: string[];
    logoutUrls?: string[];
}

export class CognitoConstruct extends Construct {
    public readonly userPool: UserPool;
    public readonly userPoolClient: UserPoolClient;

    constructor(scope: Construct, id: string, props: CognitoProps) {
        super(scope, id);

        this.userPool = new UserPool(this, `${props.projectPrefix}-UserPool`, {
            userPoolName: `${props.projectPrefix}-UserPool`,
            selfSignUpEnabled: true,
            signInAliases: { email: true },
            standardAttributes: {
                email: { required: true, mutable: false },
            },
            passwordPolicy: { minLength: 8, requireDigits: true, requireLowercase: true, requireUppercase: true, requireSymbols: false },
            accountRecovery: AccountRecovery.EMAIL_ONLY,
            //       passwordPolicy: {
            //         minLength: 8,
            //         requireDigits: true,
            //         requireLowercase: true,
            //         requireUppercase: true,
            //         requireSymbols: false,
            //       },
            //the verification email stuff is default template code.
        });


        this.userPoolClient = this.userPool.addClient(`${props.projectPrefix}-UserPoolClient`, {
            userPoolClientName: `${props.projectPrefix}-WebClient`,
            // For purely token-based, SRP/password flows are fine;
            // if you’re using Hosted UI, also enable OAuth below.
            authFlows: { userSrp: true, userPassword: true },
            oAuth: props.callbackUrls
                ? {
                    flows: { authorizationCodeGrant: true },
                    scopes: [OAuthScope.OPENID, OAuthScope.EMAIL],
                    callbackUrls: props.callbackUrls,
                    logoutUrls: props.logoutUrls ?? props.callbackUrls,
                }
                : undefined,
            preventUserExistenceErrors: true,
            enableTokenRevocation: true,
            generateSecret: false, // public web/mobile clients shouldn’t have a client secret
            //we will hate secret anyway trust me
        });
    }
}
