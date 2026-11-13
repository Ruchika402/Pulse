import uuid

from rest_framework.permissions import BasePermission


class HasVisitorId(BasePermission):
    """
    Ensures the request has a valid X-Visitor-Id header.
    """

    message = "A valid X-Visitor-Id header is required."

    def has_permission(self, request, view):
        visitor_id = request.headers.get("X-Visitor-Id")
        if not visitor_id:
            return False

        try:
            uuid.UUID(visitor_id)
        except ValueError:
            return False

        # Attach to request for easy access in views
        request.visitor_id = visitor_id
        return True
