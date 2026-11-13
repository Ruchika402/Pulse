"""
Pulse — Django settings.
Reads all values from environment via django-environ.
"""

from pathlib import Path
import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DEBUG=(bool, False),
    PULSE_MODE=(str, "single"),
    MIN_INTERVAL=(int, 30),
    MAX_MONITORS_TOTAL=(int, 500),
    MAX_MONITORS_PER_VISITOR=(int, 10),
    MAX_MONITORS_PER_HOST=(int, 5),
    ALLOW_PRIVATE_TARGETS=(bool, False),
    ENABLE_ADMIN=(bool, True),
    FEATURE_ALERTS=(bool, False),
    FEATURE_BADGE=(bool, True),
    FEATURE_SSE_FALLBACK=(bool, False),
)

# Load backend/.env
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("SECRET_KEY")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])

# Applications
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party
    "rest_framework",
    "drf_spectacular",
    "channels",
    "corsheaders",
    "django_prometheus",
    "csp",
    # Local
    "core",
    "monitors",
    "realtime",
]

MIDDLEWARE = [
    "django_prometheus.middleware.PrometheusBeforeMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "csp.middleware.CSPMiddleware",
    "django_prometheus.middleware.PrometheusAfterMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# Database — TimescaleDB is Postgres + extension
DATABASES = {
    "default": env.db("DATABASE_URL"),
}
DATABASES["default"]["CONN_HEALTH_CHECKS"] = True
DATABASES["default"]["OPTIONS"] = {
    "pool": {"min_size": 2, "max_size": 5},
}

# Redis (cache + Channels layer + Celery broker later)
REDIS_URL = env("REDIS_URL")

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": REDIS_URL,
    }
}

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {"hosts": [REDIS_URL]},
    }
}

# DRF
REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Pulse API",
    "VERSION": "0.1.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

# Password validators kept simple — we have no login
AUTH_PASSWORD_VALIDATORS = []

# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# Static
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# CORS — development only
if DEBUG:
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

# Security headers (Phase 4 tightens these)
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

# CSP placeholder — tightened in Phase 4
CONTENT_SECURITY_POLICY = {
    "DIRECTIVES": {
        "default-src": ["'self'"],
        "img-src": ["'self'", "data:"],
        "script-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "connect-src": ["'self'", "ws:", "wss:"],
    }
}

# Pulse settings
PULSE_MODE = env("PULSE_MODE")
MIN_INTERVAL = env("MIN_INTERVAL")
MAX_MONITORS_TOTAL = env("MAX_MONITORS_TOTAL")
MAX_MONITORS_PER_VISITOR = env("MAX_MONITORS_PER_VISITOR")
MAX_MONITORS_PER_HOST = env("MAX_MONITORS_PER_HOST")
ALLOW_PRIVATE_TARGETS = env("ALLOW_PRIVATE_TARGETS")
ENABLE_ADMIN = env("ENABLE_ADMIN")
FEATURE_ALERTS = env("FEATURE_ALERTS")
FEATURE_BADGE = env("FEATURE_BADGE")
FEATURE_SSE_FALLBACK = env("FEATURE_SSE_FALLBACK")

# Structured logging (basic; refined in Phase 10)
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "plain": {"format": "%(asctime)s %(levelname)s %(name)s %(message)s"},
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "plain"},
    },
    "root": {"handlers": ["console"], "level": "INFO"},
}
