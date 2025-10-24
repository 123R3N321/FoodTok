import { Construct } from 'constructs';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { join } from 'path';

interface LambdaProps {
  table: Table;
  imageBucket: Bucket;
  projectPrefix: string;
}

export class LambdaConstruct extends Construct {
  public readonly fn: Function;

  constructor(scope: Construct, id: string, props: LambdaProps) {
    super(scope, id);

    this.fn = new Function(this, `${props.projectPrefix}-BackendFn`, {
      runtime: Runtime.PYTHON_3_12,
      handler: 'handler.lambda_handler',
      code: Code.fromAsset(join(__dirname, '../../lambda')),
      environment: {
        TABLE_NAME: props.table.tableName,
        IMAGE_BUCKET: props.imageBucket.bucketName,
      },
    });

    props.table.grantReadWriteData(this.fn);
    props.imageBucket.grantReadWrite(this.fn);
  }
}
