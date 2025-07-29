from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    email = models.EmailField(unique=True)
    points = models.IntegerField(default=50)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

class Item(models.Model):
    MODERATION_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField()
    image = models.ImageField(upload_to='items/', blank=True, null=True)
    featured = models.BooleanField(default=False)
    available = models.BooleanField(default=True)
    uploader = models.ForeignKey(User, on_delete=models.CASCADE, related_name='items')
    created_at = models.DateTimeField(auto_now_add=True)
    point_value = models.IntegerField(
        null=True, 
        blank=True, 
        help_text="Points required to redeem this item. If empty, item can only be swapped."
    )
    moderation_status = models.CharField(
        max_length=20, 
        choices=MODERATION_STATUS_CHOICES, 
        default='pending'
    ) # New field
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title

class Swap(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='swaps') # The user initiating the swap/redeem
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='swap_requests') # The item being requested
    requested_item = models.ForeignKey(Item, on_delete=models.SET_NULL, related_name='offered_in_swaps', null=True, blank=True) # The item offered by 'user' for a swap
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        # Ensure unique combination for a user requesting an item, either via points (requested_item=None)
        # or by offering a specific item.
        unique_together = ['user', 'item', 'requested_item'] 
    
    def __str__(self):
        if self.requested_item:
            return f"{self.user.email} offers {self.requested_item.title} for {self.item.title} ({self.status})"
        return f"{self.user.email} redeems {self.item.title} ({self.status})"
