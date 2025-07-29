from django.urls import path
from . import views

urlpatterns = [
    path('csrf/', views.get_csrf_token, name='csrf'),
    path('signup/', views.register_user, name='signup'),
    path('login/', views.login_user, name='login'),
    path('logout/', views.logout_user, name='logout'),
    path('user/profile/', views.user_profile, name='user_profile'),
    path('items/', views.ItemListCreateView.as_view(), name='items'),
    path('items/<int:pk>/', views.ItemDetailView.as_view(), name='item_detail'), # Now handles PUT/PATCH/DELETE
    path('items/featured/', views.featured_items, name='featured_items'),
    path('swaps/', views.user_swaps, name='user_swaps'), # Swaps initiated by user
    path('my-item-swaps/', views.my_item_swaps, name='my_item_swaps'), # Swaps for user's items
    path('swaps/create/', views.create_swap, name='create_swap'),
    path('swaps/<int:pk>/approve/', views.approve_swap, name='approve_swap'),
    path('swaps/<int:pk>/disapprove/', views.disapprove_swap, name='disapprove_swap'), # Disapprove swap
    
    # Moderator Endpoints
    path('moderator/items/', views.moderator_items_list, name='moderator_items_list'),
    path('moderator/items/<int:pk>/approve/', views.approve_item, name='approve_item'),
    path('moderator/items/<int:pk>/reject/', views.reject_item, name='reject_item'),
    path('moderator/items/<int:pk>/delete/', views.delete_item_moderator, name='delete_item_moderator'),
]
