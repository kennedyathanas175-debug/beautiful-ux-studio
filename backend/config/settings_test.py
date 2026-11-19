from .settings import *  # noqa: F401,F403

DEBUG = False
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
REST_FRAMEWORK = {
    **REST_FRAMEWORK,  # noqa: F405
    "DEFAULT_THROTTLE_CLASSES": [],
}
MEDIA_ROOT = BASE_DIR / "test_media"  # noqa: F405
PRIVATE_MEDIA_ROOT = BASE_DIR / "test_private_media"  # noqa: F405
