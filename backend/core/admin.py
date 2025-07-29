from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Item, Swap

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['email', 'username', 'points', 'is_staff']
    list_filter = ['is_staff', 'is_superuser']
    search_fields = ['email', 'username']
    
    fieldsets = UserAdmin.fieldsets + (
        ('Custom Fields', {'fields': ('points',)}),
    )

@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ['title', 'uploader', 'featured', 'available', 'created_at']
    list_filter = ['featured', 'available', 'created_at']
    search_fields = ['title', 'description']
    list_editable = ['featured', 'available']

@admin.register(Swap)
class SwapAdmin(admin.ModelAdmin):
    list_display = ['user', 'item', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['user__email', 'item__title']
    list_editable = ['status']
