from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsStaff(BasePermission):
    message = "Staff access is required."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class IsAuthenticatedOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        return bool(request.method in SAFE_METHODS or (request.user and request.user.is_authenticated))


class IsOwnerOrStaff(BasePermission):
    """Object permission using ``owner_attr`` (default: ``creator``)."""

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        if request.user and request.user.is_staff:
            return True
        owner_attr = getattr(view, "owner_attr", "creator")
        owner = getattr(obj, owner_attr, None)
        return bool(request.user and request.user.is_authenticated and owner == request.user)
