import os
import uuid
import random
import boto3
from flask import Flask, jsonify
from botocore.client import Config
from botocore.session import get_session
from io import BytesIO

app = Flask(__name__)

# ==========================================================
# Global AWS Client Setup (Local vs Production)
# ==========================================================

IS_LOCAL = os.getenv("IS_LOCAL", "false").lower() == "true"
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
TABLE_NAME = os.getenv("TABLE_NAME", "FoodTokLocal")
IMAGE_BUCKET = os.getenv("IMAGE_BUCKET", "foodtok-local-images")
DYNAMODB_ENDPOINT = os.getenv("DYNAMODB_ENDPOINT")
S3_ENDPOINT = os.getenv("S3_ENDPOINT")

if IS_LOCAL:
    print("Running in LOCAL mode")

    # Create unsigned DynamoDB and S3 clients for local testing
    session = get_session()
    session.set_credentials(access_key='fake', secret_key='fake')
    anon_config = Config(signature_version=None)

    dynamodb = boto3.resource(
        "dynamodb",
        region_name=AWS_REGION,
        endpoint_url=DYNAMODB_ENDPOINT,
        config=anon_config,
    )

    s3 = boto3.client(
        "s3",
        region_name=AWS_REGION,
        endpoint_url=S3_ENDPOINT,
        config=anon_config,
    )

else:
    print("Running in AWS ECS/Production mode")
    dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
    s3 = boto3.client("s3", region_name=AWS_REGION)

# ==========================================================
# Flask Routes
# ==========================================================

@app.route("/helloECS", methods=["GET"])
def health():
    return jsonify({"status": "healthy"}), 200


@app.route("/insertECS", methods=["POST"])
def insert_item():
    """Insert a test record into DynamoDB"""
    try:
        table = dynamodb.Table(TABLE_NAME)
        item = {
            "userId": str(uuid.uuid4()),
            "random_value": random.randint(1, 1000)
        }
        table.put_item(Item=item)
        return jsonify({
            "message": "Item inserted successfully!",
            "item": item
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/listECS", methods=["GET"])
def list_items():
    """List all items from DynamoDB (for local verification)."""
    try:
        table = dynamodb.Table(TABLE_NAME)
        response = table.scan()
        items = response.get("Items", [])
        return jsonify(items), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/uploadECS", methods=["POST"])
def upload_sample_file():
    """Upload a small test file to S3 to verify connectivity."""
    try:
        # Generate a random filename and simple content
        file_name = f"sample_{uuid.uuid4().hex[:8]}.txt"
        file_content = f"Hello from ECS local test! ID={uuid.uuid4()}"
        s3.upload_fileobj(BytesIO(file_content.encode()), IMAGE_BUCKET, file_name)

        file_url = f"{S3_ENDPOINT}/{IMAGE_BUCKET}/{file_name}" if IS_LOCAL else f"https://{IMAGE_BUCKET}.s3.amazonaws.com/{file_name}"

        return jsonify({
            "message": "File uploaded successfully!",
            "file_name": file_name,
            "file_url": file_url
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route("/downloadECS/<filename>", methods=["GET"])
def download_file(filename):
    """Download a file from S3 and return its contents."""
    try:
        response = s3.get_object(Bucket=IMAGE_BUCKET, Key=filename)
        file_content = response["Body"].read().decode("utf-8")

        return jsonify({
            "file_name": filename,
            "content": file_content
        }), 200
    except s3.exceptions.NoSuchKey:
        return jsonify({"error": f"File '{filename}' not found."}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==========================================================
# Main Entry Point
# ==========================================================

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
