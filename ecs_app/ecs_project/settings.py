import os
from pathlib import Path
import boto3
from botocore.client import Config
from botocore.session import get_session

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = "dummy-secret-for-local"

DEBUG = True

ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    "corsheaders",

    # your app
    'api',
]

# ==========================================================
# Static Files (Required for admin + runserver)
# ==========================================================

STATIC_URL = '/static/'

# Where Django will collect static files (for production)
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Optional: where Django looks for additional static files
STATICFILES_DIRS = []



MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',     # REQUIRED
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',  # REQUIRED
    'django.contrib.messages.middleware.MessageMiddleware',     # REQUIRED
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

CORS_ALLOW_ALL_ORIGINS = True

ROOT_URLCONF = "ecs_project.urls"

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],  # Leave empty or add template dirs
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = "ecs_project.wsgi.application"

# -------------------------------------------------------------------
# Environment Variables 
# -------------------------------------------------------------------
IS_LOCAL = os.getenv("IS_LOCAL", "false").lower() == "true"
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
TABLE_NAME = os.getenv("TABLE_NAME", "FoodTokLocal")
IMAGE_BUCKET = os.getenv("IMAGE_BUCKET", "foodtok-local-images")
DYNAMODB_ENDPOINT = os.getenv("DYNAMODB_ENDPOINT")
S3_ENDPOINT = os.getenv("S3_ENDPOINT")

# -------------------------------------------------------------------
# Global DynamoDB / S3 Setup 
# -------------------------------------------------------------------
if IS_LOCAL:
    session = get_session()
    session.set_credentials(access_key="fake", secret_key="fake")
    anon = Config(signature_version=None)

    dynamodb = boto3.resource(
        "dynamodb",
        region_name=AWS_REGION,
        endpoint_url=DYNAMODB_ENDPOINT,
        config=anon,
    )

    s3 = boto3.client(
        "s3",
        region_name=AWS_REGION,
        endpoint_url=S3_ENDPOINT,
        config=anon,
    )

else:
    dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
    s3 = boto3.client("s3", region_name=AWS_REGION)
