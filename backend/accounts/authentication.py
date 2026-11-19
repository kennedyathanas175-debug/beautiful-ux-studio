from django.middleware.csrf import CsrfViewMiddleware
from rest_framework.authentication import SessionAuthentication
from rest_framework.exceptions import PermissionDenied


class _RejectingCsrfMiddleware(CsrfViewMiddleware):
    def _reject(self, request, reason):
        raise PermissionDenied("CSRF verification failed. Refresh the page and try again.")


class CsrfEnforcingSessionAuthentication(SessionAuthentication):
    """Session auth with the same CSRF guarantee as Django, expressed as API errors."""

    def authenticate_header(self, request):
        return "Session"

    def enforce_csrf(self, request):
        checker = _RejectingCsrfMiddleware(lambda req: None)
        reason = checker.process_view(request, None, (), {})
        if reason:
            raise PermissionDenied("CSRF verification failed. Refresh the page and try again.")
