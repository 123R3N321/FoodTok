import os
import boto3
from botocore.client import Config
from botocore.session import get_session

IS_LOCAL = os.getenv("IS_LOCAL", "false").lower() == "true"
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
DYNAMODB_ENDPOINT = os.getenv("LOCAL_DYNAMO_ENDPOINT")
S3_ENDPOINT = os.getenv("LOCAL_S3_ENDPOINT")

def get_dynamodb():
    if IS_LOCAL:
        session = get_session()
        session.set_credentials(access_key="fake", secret_key="fake")
        anon = Config(signature_version=None)

        return boto3.resource(
            "dynamodb",
            region_name=AWS_REGION,
            endpoint_url=DYNAMODB_ENDPOINT,
            config=anon,
            aws_access_key_id="fake",
            aws_secret_access_key="fake",
        )

    return boto3.resource("dynamodb", region_name=AWS_REGION)


def get_s3():
    if IS_LOCAL:
        session = get_session()
        session.set_credentials(access_key="fake", secret_key="fake")
        anon = Config(signature_version=None)

        return boto3.client(
            "s3",
            region_name=AWS_REGION,
            endpoint_url=S3_ENDPOINT,
            config=anon,
        )

    return boto3.client("s3", region_name=AWS_REGION)
