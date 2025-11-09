# api/views.py
import os
import uuid
import random
from io import BytesIO
from django.http import JsonResponse

from rest_framework.decorators import api_view
from rest_framework.response import Response

from .aws import get_dynamodb, get_s3

# ===============================
# Load environment variables
# ===============================
IS_LOCAL = os.getenv("IS_LOCAL", "false").lower() == "true"
S3_ENDPOINT = os.getenv("S3_ENDPOINT")

# Add DDB tables and S3 Buckets here
USERS = os.getenv("DDB_USERS", "Users")
RESTAURANTS = os.getenv("DDB_RESTAURANTS", "Restaurants")
IMAGE_BUCKET = os.getenv("IMAGE_BUCKET", "foodtok-local-images")


dynamodb = get_dynamodb()
s3 = get_s3()


# ----------------------------------------------------
# api/helloECS
# ----------------------------------------------------
@api_view(["GET"])
def hello_ecs(request):
    return Response({"status": "healthy"}, status=200)


# ----------------------------------------------------
# api/insertECS
# ----------------------------------------------------
@api_view(["POST"])
def insert_item(request):
    try:
        table = dynamodb.Table(USERS)
        item = {
            "userId": str(uuid.uuid4()),
            "random_value": random.randint(1, 1000),
        }
        table.put_item(Item=item)

        return Response({"message": "Item inserted", "item": item}, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ----------------------------------------------------
# api/listECS
# ----------------------------------------------------
@api_view(["GET"])
def list_items(request):
    try:
        table = dynamodb.Table(USERS)
        response = table.scan()
        return Response(response.get("Items", []), status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ----------------------------------------------------
# api/uploadECS
# ----------------------------------------------------
@api_view(["POST"])
def upload_file(request):
    try:
        file_name = f"sample_{uuid.uuid4().hex[:8]}.txt"
        contents = f"Hello from Django ECS! {uuid.uuid4()}"

        # Upload to S3
        s3.upload_fileobj(BytesIO(contents.encode()), IMAGE_BUCKET, file_name)

        file_url = (
            f"{S3_ENDPOINT}/{IMAGE_BUCKET}/{file_name}" if IS_LOCAL
            else f"https://{IMAGE_BUCKET}.s3.amazonaws.com/{file_name}"
        )

        return Response({
            "message": "File uploaded!",
            "file_name": file_name,
            "file_url": file_url,
        }, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ----------------------------------------------------
# api/downloadECS/<filename>
# ----------------------------------------------------
@api_view(["GET"])
def download_file(request, filename):
    try:
        obj = s3.get_object(Bucket=IMAGE_BUCKET, Key=filename)
        data = obj["Body"].read().decode("utf-8")

        return Response({"file_name": filename, "content": data}, status=200)

    except s3.exceptions.NoSuchKey:
        return Response({"error": f"File '{filename}' not found"}, status=404)

    except Exception as e:
        return Response({"error": str(e)}, status=500)

# ----------------------------------------------------
# api/restaurants
# ----------------------------------------------------
@api_view(["GET"])
def get_restaurants(request):
    try:
        table = dynamodb.Table(RESTAURANTS)
        response = table.scan()

        items = response.get("Items", [])
        return JsonResponse(items, safe=False, status=200)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)