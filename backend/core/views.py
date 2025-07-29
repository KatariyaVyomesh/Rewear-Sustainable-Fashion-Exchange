from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import login, logout
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from .models import User, Item, Swap
from .serializers import (
    UserSerializer, UserRegistrationSerializer, LoginSerializer,
    ItemSerializer, SwapSerializer
)
from .permissions import IsUploaderOrReadOnly, IsStaffUser # Import the new permission

# POINTS_FOR_GIVING_ITEM is for when an item is swapped (not redeemed via points)
POINTS_FOR_GIVING_ITEM = 10 

@api_view(['GET'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def get_csrf_token(request):
    print(f"CSRF token requested. Token: {get_token(request)}")
    return Response({'csrfToken': get_token(request)})

@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        login(request, user)
        print(f"User registered and logged in: {user.email}")
        return Response({
            'message': 'User registered successfully',
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)
    print(f"Registration failed. Errors: {serializer.errors}")
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        login(request, user)
        print(f"User logged in: {user.email}")
        return Response({
            'message': 'Login successful',
            'user': UserSerializer(user).data
        }, status=status.HTTP_200_OK)
    print(f"Login failed. Errors: {serializer.errors}")
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_user(request):
    print(f"Attempting logout for user: {request.user.email if request.user.is_authenticated else 'Anonymous'}")
    logout(request)
    print("Logout successful on server side.")
    return Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    print(f"Profile requested for user: {request.user.email if request.user.is_authenticated else 'Anonymous'}")
    serializer = UserSerializer(request.user)
    return Response(serializer.data)

class ItemListCreateView(generics.ListCreateAPIView):
    serializer_class = ItemSerializer
    
    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated()]
        return [AllowAny()]
    
    def get_queryset(self):
        print("Fetching items for ItemListCreateView...")
        if self.request.user.is_authenticated and self.request.user.is_staff:
            # Staff users see all items regardless of moderation status
            queryset = Item.objects.all()
            print(f"Staff user. Number of items found in queryset: {queryset.count()}")
        else:
            # Regular users only see approved and available items
            queryset = Item.objects.filter(available=True, moderation_status='approved')
            print(f"Regular user. Number of approved and available items found: {queryset.count()}")
        
        for item in queryset:
            print(f"  - Item: {item.title}, Available: {item.available}, Moderation: {item.moderation_status}, Image: {item.image.url if item.image else 'No image'}")
        return queryset

    def create(self, request, *args, **kwargs):
        print(f"Received POST request to /api/items/. User authenticated: {request.user.is_authenticated}")
        print(f"Request data: {request.data}")
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        print(f"Attempting to create item for user: {self.request.user.email}")
        print(f"Received data for item: {serializer.validated_data}")
        # New items default to pending moderation status
        serializer.save(uploader=self.request.user, available=True, moderation_status='pending')
        print(f"Item created successfully: {serializer.instance.title} (ID: {serializer.instance.id}), Moderation: {serializer.instance.moderation_status}")
        print(f"Item available status: {serializer.instance.available}")
        print(f"Item image path: {serializer.instance.image.url if serializer.instance.image else 'No image'}")

class ItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ItemSerializer
    permission_classes = [IsUploaderOrReadOnly] # Use custom permission

    def get_queryset(self):
        # For detail view, if user is staff, they can see any item.
        # Otherwise, only approved and available items.
        if self.request.user.is_authenticated and self.request.user.is_staff:
            return Item.objects.all()
        return Item.objects.filter(available=True, moderation_status='approved')

    def perform_update(self, serializer):
        # Ensure the uploader field is not changed
        if 'uploader' in serializer.validated_data:
            serializer.validated_data.pop('uploader')
        # Ensure moderation_status is not changed by non-staff users
        if not self.request.user.is_staff and 'moderation_status' in serializer.validated_data:
            serializer.validated_data.pop('moderation_status')
        serializer.save()

    def perform_destroy(self, instance):
        # Optionally, handle related swaps or points before deleting
        # For now, Django's CASCADE on ForeignKey will handle related swaps
        instance.delete()

@api_view(['GET'])
@permission_classes([AllowAny])
def featured_items(request):
    items = Item.objects.filter(featured=True, available=True, moderation_status='approved')[:10] # Filter by approved
    serializer = ItemSerializer(items, many=True)
    print(f"Number of featured items found: {len(items)}")
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_swap(request):
    item_id = request.data.get('item_id')
    requested_item_id = request.data.get('requested_item_id') # New field for item-for-item swap
    
    try:
        # Ensure the item being requested is approved and available
        item = Item.objects.get(id=item_id, available=True, moderation_status='approved')
        
        if item.uploader == request.user:
            return Response(
                {'error': 'You cannot request your own item.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        requested_item = None
        if requested_item_id:
            # This is an item-for-item swap
            try:
                requested_item = Item.objects.get(id=requested_item_id, uploader=request.user, available=True)
            except Item.DoesNotExist:
                return Response(
                    {'error': 'The item you offered is not found or not available, or does not belong to you.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Prevent offering the same item as the one being requested
            if requested_item.id == item.id:
                return Response(
                    {'error': 'You cannot offer the same item you are requesting.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Set the offered item to unavailable immediately to prevent double-swapping
            requested_item.available = False
            requested_item.save()
            print(f"Offered item '{requested_item.title}' set to unavailable.")

            swap, created = Swap.objects.get_or_create(
                user=request.user,
                item=item,
                requested_item=requested_item, # Link the offered item
                defaults={'status': 'pending'}
            )
            
            if not created:
                return Response(
                    {'error': 'You have already requested this item with the same offer.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            print(f"Item-for-item swap request created: {swap.user.email} offers {swap.requested_item.title} for {swap.item.title}")

        else:
            # This is a point redemption
            if item.point_value is None: # Check if item has a point value set
                return Response(
                    {'error': 'This item cannot be redeemed via points. It is only available for swap.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if request.user.points < item.point_value: # Use item's point_value
                return Response(
                    {'error': f'Insufficient points. You need {item.point_value} points to redeem this item.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            swap, created = Swap.objects.get_or_create(
                user=request.user,
                item=item,
                requested_item=None, # Explicitly set to None for point redemption
                defaults={'status': 'pending'}
            )
            
            if not created:
                return Response(
                    {'error': 'You have already requested this item.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            request.user.points -= item.point_value # Deduct item's point_value
            request.user.save()
            print(f"User {request.user.email} points deducted by {item.point_value}. New balance: {request.user.points}")
            print(f"Point redemption request created: {swap.user.email} redeems {swap.item.title}")

        serializer = SwapSerializer(swap)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    except Item.DoesNotExist:
        return Response(
            {'error': 'Requested item not found or not available.'}, 
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_swaps(request):
    # This view lists swaps INITIATED BY the current user (both point redemptions and item-for-item swaps)
    swaps = Swap.objects.filter(user=request.user)
    serializer = SwapSerializer(swaps, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_item_swaps(request):
    # This view lists swaps REQUESTED FOR items UPLOADED BY the current user
    swaps = Swap.objects.filter(item__uploader=request.user).order_by('-created_at')
    serializer = SwapSerializer(swaps, many=True)
    print(f"My item swaps requested for user {request.user.email}. Found {swaps.count()} swaps.")
    return Response(serializer.data)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def approve_swap(request, pk):
    try:
        swap = Swap.objects.get(pk=pk)
    except Swap.DoesNotExist:
        return Response({'error': 'Swap request not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.user != swap.item.uploader:
        return Response({'error': 'You are not authorized to approve this swap.'}, status=status.HTTP_403_FORBIDDEN)

    if swap.status != 'pending':
        return Response({'error': f'Swap is already {swap.status}.'}, status=status.HTTP_400_BAD_REQUEST)

    uploader_user = swap.item.uploader # The owner of the item being requested
    item_to_give = swap.item # The item being requested

    if swap.requested_item:
        # This is an item-for-item swap
        offered_item = swap.requested_item
        
        # Ensure both items are set to unavailable
        item_to_give.available = False
        item_to_give.save()
        offered_item.available = False
        offered_item.save()
        
        # Uploader gets POINTS_FOR_GIVING_ITEM for successfully swapping their item
        uploader_user.points += POINTS_FOR_GIVING_ITEM
        uploader_user.save()
        print(f"Uploader {uploader_user.email} points increased by {POINTS_FOR_GIVING_ITEM} for swap. New balance: {uploader_user.points}")
        print(f"Item-for-item swap {swap.id} approved. '{item_to_give.title}' and '{offered_item.title}' are now unavailable.")
        
    else:
        # This is a point redemption
        # Uploader gets the item's point_value for giving it away via points
        if item_to_give.point_value is not None:
            uploader_user.points += item_to_give.point_value
            uploader_user.save()
            print(f"Uploader {uploader_user.email} points increased by {item_to_give.point_value} for redemption. New balance: {uploader_user.points}")
        else:
            print(f"Warning: Item {item_to_give.title} redeemed via points but has no point_value set for uploader to gain.")
        
        item_to_give.available = False
        item_to_give.save()
        print(f"Point redemption {swap.id} approved. Item '{item_to_give.title}' is now unavailable.")

    swap.status = 'approved'
    swap.save()
    
    serializer = SwapSerializer(swap)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def disapprove_swap(request, pk):
    try:
        swap = Swap.objects.get(pk=pk)
    except Swap.DoesNotExist:
        return Response({'error': 'Swap request not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.user != swap.item.uploader:
        return Response({'error': 'You are not authorized to disapprove this swap.'}, status=status.HTTP_403_FORBIDDEN)

    if swap.status != 'pending':
        return Response({'error': f'Swap is already {swap.status}. Only pending swaps can be disapproved.'}, status=status.HTTP_400_BAD_REQUEST)

    # If an item was offered in the swap, make it available again
    if swap.requested_item:
        offered_item = swap.requested_item
        offered_item.available = True
        offered_item.save()
        print(f"Offered item '{offered_item.title}' made available again after swap disapproval.")
    
    # If it was a point redemption, refund points to the requester
    if not swap.requested_item: # This was a point redemption
        requester = swap.user
        if swap.item.point_value is not None:
            requester.points += swap.item.point_value # Refund points to requester
            requester.save()
            print(f"Requester {requester.email} refunded {swap.item.point_value} points for disapproved redemption.")

    swap.status = 'rejected'
    swap.save()
    
    serializer = SwapSerializer(swap)
    return Response(serializer.data, status=status.HTTP_200_OK)

# --- Moderator-specific views ---

@api_view(['GET'])
@permission_classes([IsStaffUser])
def moderator_items_list(request):
    """
    Lists all items for moderation, regardless of availability or moderation status.
    Only accessible by staff users.
    """
    items = Item.objects.all().order_by('-created_at')
    serializer = ItemSerializer(items, many=True)
    return Response(serializer.data)

@api_view(['PATCH'])
@permission_classes([IsStaffUser])
def approve_item(request, pk):
    """
    Approves an item, setting its moderation_status to 'approved'.
    Only accessible by staff users.
    """
    try:
        item = Item.objects.get(pk=pk)
    except Item.DoesNotExist:
        return Response({'error': 'Item not found.'}, status=status.HTTP_404_NOT_FOUND)
    
    item.moderation_status = 'approved'
    item.save()
    serializer = ItemSerializer(item)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['PATCH'])
@permission_classes([IsStaffUser])
def reject_item(request, pk):
    """
    Rejects an item, setting its moderation_status to 'rejected'.
    Also makes the item unavailable.
    Only accessible by staff users.
    """
    try:
        item = Item.objects.get(pk=pk)
    except Item.DoesNotExist:
        return Response({'error': 'Item not found.'}, status=status.HTTP_404_NOT_FOUND)
    
    item.moderation_status = 'rejected'
    item.available = False # Rejected items should not be available
    item.save()
    serializer = ItemSerializer(item)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['DELETE'])
@permission_classes([IsStaffUser])
def delete_item_moderator(request, pk):
    """
    Deletes an item. This is a moderator-specific delete,
    allowing them to remove any item.
    """
    try:
        item = Item.objects.get(pk=pk)
    except Item.DoesNotExist:
        return Response({'error': 'Item not found.'}, status=status.HTTP_404_NOT_FOUND)
    
    item.delete()
    return Response({'message': 'Item deleted successfully.'}, status=status.HTTP_204_NO_CONTENT)
