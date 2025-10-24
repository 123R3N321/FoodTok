import { Construct } from 'constructs';
import { Bucket, BucketAccessControl, BlockPublicAccess } from 'aws-cdk-lib/aws-s3';
import { RemovalPolicy } from 'aws-cdk-lib';

export interface S3Props {
  projectPrefix: string;
}

export class S3Construct extends Construct {
  public readonly websiteBucket: Bucket;
  public readonly imageBucket: Bucket;

  constructor(scope: Construct, id: string, props: S3Props) {
    super(scope, id);

    this.websiteBucket = new Bucket(this, `${props.projectPrefix}-WebsiteBucket`, {
      websiteIndexDocument: 'index.html',
      publicReadAccess: true,
      blockPublicAccess: new BlockPublicAccess({
        blockPublicAcls: false,
        ignorePublicAcls: false,
        blockPublicPolicy: false,
        restrictPublicBuckets: false
      }),
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    this.imageBucket = new Bucket(this, `${props.projectPrefix}-ImageBucket`, {
      accessControl: BucketAccessControl.PRIVATE,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
  }
}
