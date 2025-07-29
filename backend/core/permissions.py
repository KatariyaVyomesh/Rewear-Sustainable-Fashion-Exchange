from rest_framework import permissions

class IsUploaderOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow uploaders of an object to edit or delete it.
    Read permissions are allowed to any authenticated user.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request, so we'll always allow GET, HEAD, or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the uploader of the item.
        return obj.uploader == request.user

class IsStaffUser(permissions.BasePermission):
    """
    Custom permission to only allow staff users to access.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_staff
