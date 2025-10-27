# your_app/management/commands/seed_cloud.py
from django.core.management.base import BaseCommand
from django.conf import settings
import boto3, os, json, time
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Attr

def wait_for_bucket(s3_client, bucket_name, max_retries=10, delay=2):
    for attempt in range(1, max_retries + 1):
        try:
            s3_client.head_bucket(Bucket=bucket_name)
            return True
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code", "")
            if code in ["404", "NoSuchBucket"]:
                time.sleep(delay)
            else:
                return False
    return False

def seed_dynamodb_table(dynamodb, table_name: str, seed_file_path: str, pk_name: str = "id"):
    try:
        table = dynamodb.Table(table_name)
        with open(seed_file_path, "r") as f:
            items = json.load(f)

        print(f"Seeding DynamoDB table '{table_name}' with {len(items)} items...")
        for item in items:
            # Idempotent write: only insert if the PK doesn't exist yet.
            # Adjust ConditionExpression for your real key(s).
            try:
                table.put_item(
                    Item=item,
                    ConditionExpression=Attr(pk_name).not_exists()
                )
                print(f"Inserted {item.get(pk_name)}")
            except ClientError as e:
                if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                    print(f"Skipped existing item {item.get(pk_name)}")
                else:
                    print(f"Error writing {item}: {e}")
        print("DynamoDB seeding complete.")
    except FileNotFoundError:
        print(f"DynamoDB seed file not found: {seed_file_path}")

def seed_s3_bucket(s3_client, bucket_name: str, seed_dir_path: str, skip_if_exists=True):
    if not os.path.exists(seed_dir_path):
        print(f"No S3 seed directory found at {seed_dir_path}")
        return
    if not wait_for_bucket(s3_client, bucket_name):
        print(f"Bucket '{bucket_name}' not reachable; aborting S3 seed.")
        return

    files = [f for f in os.listdir(seed_dir_path)
             if os.path.isfile(os.path.join(seed_dir_path, f))]
    print(f"Uploading {len(files)} files to s3://{bucket_name}/ ...")
    for name in files:
        local_path = os.path.join(seed_dir_path, name)
        try:
            if skip_if_exists:
                try:
                    s3_client.head_object(Bucket=bucket_name, Key=name)
                    print(f"Skipped existing {name}")
                    continue
                except ClientError as e:
                    if e.response["Error"]["Code"] not in ["404", "NotFound", "NoSuchKey"]:
                        raise
            with open(local_path, "rb") as fh:
                s3_client.put_object(Bucket=bucket_name, Key=name, Body=fh)
            print(f"Uploaded {name}")
        except Exception as e:
            print(f"Upload failed for {name}: {e}")
    print("S3 seeding complete.")

class Command(BaseCommand):
    help = "Seed DynamoDB and S3 (LocalStack or AWS) with initial data."

    def add_arguments(self, parser):
        parser.add_argument("--local", action="store_true",
                            help="Force LocalStack (overrides env).")
        parser.add_argument("--prod", action="store_true",
                            help="Force AWS (overrides env).")
        parser.add_argument("--table", default=os.getenv("SEED_DYNAMO_TABLE", "FoodTokLocal"))
        parser.add_argument("--bucket", default=os.getenv("SEED_S3_BUCKET", "foodtok-local-images"))
        parser.add_argument("--dynamo-seed", default=os.getenv("DYNAMO_SEED_PATH",
                            "seed_data/dynamo_seed/dynamo_seed.json"))
        parser.add_argument("--s3-seed", default=os.getenv("S3_SEED_DIR", "seed_data/s3_seed"))
        parser.add_argument("--region", default=os.getenv("AWS_REGION", "us-east-1"))
        parser.add_argument("--pk-name", default=os.getenv("SEED_PK_NAME", "id"),
                            help="Primary key attribute name for idempotent inserts.")

    def handle(self, *args, **opts):
        # Decide local vs prod
        env_default_local = str(os.getenv("IS_LOCAL", "true")).lower() == "true"
        is_local = opts["local"] or (env_default_local and not opts["prod"])

        region = opts["region"]
        table_name = opts["table"]
        bucket_name = opts["bucket"]
        dynamo_seed = opts["dynamo_seed"]
        s3_seed = opts["s3_seed"]
        pk_name = opts["pk_name"]

        if is_local:
            dynamo_endpoint = os.getenv("LOCAL_DYNAMO_ENDPOINT", "http://localhost:8000")
            s3_endpoint = os.getenv("LOCAL_S3_ENDPOINT", "http://localhost:4566")
            aws_key = "test"
            aws_secret = "test"
            print(f"Seeding LocalStack at {dynamo_endpoint} / {s3_endpoint}")
        else:
            dynamo_endpoint = None
            s3_endpoint = None
            aws_key = None
            aws_secret = None
            print("Seeding AWS (production credentials from env/instance profile)")

        dynamodb = boto3.resource(
            "dynamodb",
            region_name=region,
            endpoint_url=dynamo_endpoint,
            aws_access_key_id=aws_key,
            aws_secret_access_key=aws_secret,
        )
        s3 = boto3.client(
            "s3",
            region_name=region,
            endpoint_url=s3_endpoint,
            aws_access_key_id=aws_key,
            aws_secret_access_key=aws_secret,
        )

        seed_dynamodb_table(dynamodb, table_name, dynamo_seed, pk_name=pk_name)
        seed_s3_bucket(s3, bucket_name, s3_seed, skip_if_exists=True)

        self.stdout.write(self.style.SUCCESS("Cloud seeding completed."))