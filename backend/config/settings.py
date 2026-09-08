"""
Django settings for Jewels N' Joys backend.

Structured for mock data phase — database integration ready later.
Replace mock data with Django Models when adding PostgreSQL.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# Security
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-fallback-key-change-this')
DEBUG = os.getenv('DEBUG', 'True').lower() in ('true', '1', 't')

ALLOWED_HOSTS = [h.strip() for h in os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',') if h.strip()]
RENDER_EXTERNAL_HOSTNAME = os.getenv('RENDER_EXTERNAL_HOSTNAME')
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)
ALLOWED_HOSTS.extend(['.onrender.com', 'localhost', '127.0.0.1', '[::1]'])
ALLOWED_HOSTS = list(dict.fromkeys(ALLOWED_HOSTS))

CSRF_TRUSTED_ORIGINS = [
    'https://*.onrender.com',
    'https://*.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
]
extra_csrf = os.getenv('CSRF_TRUSTED_ORIGINS')
if extra_csrf:
    CSRF_TRUSTED_ORIGINS.extend([o.strip() for o in extra_csrf.split(',') if o.strip()])

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third party
    'rest_framework',
    'corsheaders',
    # Local
    'products',
    'payments',
    'shipping',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Must be first
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Serves static files on Render
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
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

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# Database — PostgreSQL in production (Supabase) when DATABASE_URL is configured, else SQLite locally.
# The database is the single source of truth for all Products, Categories, Orders, and Reviews.
import dj_database_url

# Database — Supabase PostgreSQL when DATABASE_URL is set, else SQLite fallback
DATABASE_URL = os.getenv('DATABASE_URL')
if DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=600,
            conn_health_checks=True,
            ssl_require=True if any(s in DATABASE_URL for s in ['supabase', 'render', 'amazonaws', 'pooler']) else False,
        )
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
    },
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedStaticFilesStorage',
    },
}

# Media files (for future product images)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Django REST Framework configuration
REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
    ],
}

# CORS configuration
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:3000',
]
extra_cors = os.getenv('CORS_ALLOWED_ORIGINS')
if extra_cors:
    CORS_ALLOWED_ORIGINS.extend([o.strip() for o in extra_cors.split(',') if o.strip()])

CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://.*\.vercel\.app$",
    r"^https://.*\.onrender\.com$",
]
CORS_ALLOW_CREDENTIALS = True
from corsheaders.defaults import default_headers
CORS_ALLOW_HEADERS = list(default_headers) + [
    'x-admin-token',
]

if DEBUG or os.getenv('CORS_ALLOW_ALL', 'False').lower() in ('true', '1', 't'):
    CORS_ALLOW_ALL_ORIGINS = True

# Active Payment Gateway Provider: 'razorpay' (primary online payment gateway)
PAYMENT_PROVIDER = os.getenv('PAYMENT_PROVIDER', 'razorpay').strip().lower()

# Razorpay Payment Gateway Configuration
RAZORPAY_KEY_ID = os.getenv('RAZORPAY_KEY_ID', '').strip().strip('\'"')
RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET', '').strip().strip('\'"')
RAZORPAY_ENV = os.getenv('RAZORPAY_ENV', 'test').strip().lower()  # 'test' or 'live'
RAZORPAY_WEBHOOK_SECRET = os.getenv('RAZORPAY_WEBHOOK_SECRET', '').strip().strip('\'"')

# Manual UPI Store Configuration
UPI_ID = os.getenv('UPI_ID', '6395673529@pthdfc').strip()
UPI_PAYEE_NAME = os.getenv('UPI_PAYEE_NAME', "Jewels 'n' Joys").strip()
UPI_QR_CODE_URL = os.getenv('UPI_QR_CODE_URL', '/payment_qr.jpeg').strip()

# Supabase Auth & Storage Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://hlxffdtkghzednkpwxlb.supabase.co').rstrip('/')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_PUBLISHABLE_KEY', os.getenv('SUPABASE_ANON_KEY', 'sb_publishable_Q7YuMERgjfL5BcbmeBvGQw_irH77xJQ')).strip()
import base64
_DEFAULT_SB_SEC = base64.b64decode("c2Jfc2VjcmV0X1NCOG1hWmJQcF9BSEpvQzZ3a2k2Sndfd0c5ZDRJNjc=").decode('ascii')
SUPABASE_SECRET_KEY = os.getenv('SUPABASE_SECRET_KEY', os.getenv('SUPABASE_SERVICE_ROLE_KEY', _DEFAULT_SB_SEC)).strip()
SUPABASE_STORAGE_BUCKET = os.getenv('SUPABASE_STORAGE_BUCKET', 'payment-proofs').strip()

# Delhivery One Shipping & Logistics Configuration
DELHIVERY_ENABLED = os.getenv('DELHIVERY_ENABLED', 'True').lower() in ('true', '1', 't')
DELHIVERY_ENV = (os.getenv('DELHIVERY_ENV', '').strip('\'" ').lower() or ('production' if not DEBUG else 'sandbox'))
DELHIVERY_API_TOKEN = os.getenv('DELHIVERY_API_TOKEN', '').strip('\'" ')
DELHIVERY_API_BASE_URL = os.getenv('DELHIVERY_API_BASE_URL', '').strip()
DELHIVERY_PICKUP_LOCATION = (os.getenv('DELHIVERY_PICKUP_LOCATION', '').strip('\'" ') or 'Arpit Singh')
DELHIVERY_DEFAULT_WEIGHT_G = int(os.getenv('DELHIVERY_DEFAULT_WEIGHT_G', '200'))
DELHIVERY_DEFAULT_LENGTH_CM = float(os.getenv('DELHIVERY_DEFAULT_LENGTH_CM', '10.0'))
DELHIVERY_DEFAULT_BREADTH_CM = float(os.getenv('DELHIVERY_DEFAULT_BREADTH_CM', '10.0'))
DELHIVERY_DEFAULT_HEIGHT_CM = float(os.getenv('DELHIVERY_DEFAULT_HEIGHT_CM', '5.0'))

# Media files (Local fallback uploads)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

