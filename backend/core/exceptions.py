from __future__ import annotations

import logging

from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.http import Http404, JsonResponse
from django.views.decorators.csrf import csrf_protect
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger("tie")


def _error_payload(code: str, message: str, fields: dict | None = None) -> dict:
    payload = {"error": {"code": code, "message": message}}
    if fields:
        payload["error"]["fields"] = fields
    return payload


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    view = context.get("view").__class__.__name__ if context.get("view") else "unknown"
    if response is not None:
        code = getattr(exc, "default_code", "error")
        if isinstance(exc, exceptions.ValidationError):
            detail = exc.detail
            if isinstance(detail, dict):
                fields = {
                    key: [str(item) for item in (value if isinstance(value, (list, tuple)) else [value])]
                    for key, value in detail.items()
                }
                message = "Please check the submitted data."
                payload = _error_payload("validation_error", message, fields)
            else:
                message = "; ".join(str(item) for item in detail) if isinstance(detail, (list, tuple)) else str(detail)
                payload = _error_payload("validation_error", message)
        elif isinstance(exc, exceptions.NotFound):
            payload = _error_payload("not_found", "The requested resource was not found.")
        elif isinstance(exc, exceptions.PermissionDenied):
            payload = _error_payload("permission_denied", "You do not have permission to perform this action.")
        elif isinstance(exc, exceptions.NotAuthenticated):
            payload = _error_payload("authentication_required", "Please log in to continue.")
        elif isinstance(exc, exceptions.Throttled):
            payload = _error_payload("rate_limited", "Too many requests. Please try again shortly.")
        elif isinstance(exc, exceptions.AuthenticationFailed):
            payload = _error_payload("authentication_failed", "Invalid credentials or session.")
        elif isinstance(exc, Http404):
            payload = _error_payload("not_found", "The requested resource was not found.")
        elif isinstance(exc, DjangoPermissionDenied):
            payload = _error_payload("permission_denied", "You do not have permission to perform this action.")
        else:
            detail = getattr(exc, "detail", None)
            message = detail if isinstance(detail, str) else "The request could not be completed."
            payload = _error_payload(str(code), str(message))
        response.data = payload
        if response.status_code == status.HTTP_401_UNAUTHORIZED:
            response["WWW-Authenticate"] = "Session"
        return response

    if isinstance(exc, Http404):
        return Response(
            _error_payload("not_found", "The requested resource was not found."),
            status=status.HTTP_404_NOT_FOUND,
        )

    if isinstance(exc, DjangoPermissionDenied):
        return Response(
            _error_payload("permission_denied", "You do not have permission to perform this action."),
            status=status.HTTP_403_FORBIDDEN,
        )

    logger.exception("Unhandled API error in %s", view)
    return Response(
        _error_payload("server_error", "Something went wrong. Please try again."),
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


@csrf_protect
def csrf_failure(request, reason=""):
    return JsonResponse(
        _error_payload("csrf_failed", "CSRF verification failed. Refresh the page and try again."),
        status=403,
    )
