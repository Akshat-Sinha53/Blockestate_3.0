from django.urls import path
from . import views
from . import chat_views

urlpatterns = [
    path('user-properties/', views.get_user_properties, name='user_properties'),
    path('property/<str:property_id>/', views.get_property_details, name='property_details'),
    path('flag-property-for-sale/', views.flag_property_for_sale, name='flag_property_for_sale'),
    path('marketplace/', views.get_marketplace_properties, name='marketplace_properties'),
    path('user-profile/', views.get_user_profile, name='user_profile'),
    path('dev/seed/', views.dev_seed_data, name='dev_seed_data'),
    
    # Chat endpoints
    path('chats/initiate/', chat_views.initiate_chat, name='initiate_chat'),
    path('chats/send-message/', chat_views.send_chat_message, name='send_chat_message'),
    path('chats/<str:chat_id>/messages/', chat_views.get_chat_history, name='get_chat_history'),
    path('chats/<str:chat_id>/info/', chat_views.get_chat_info, name='get_chat_info'),
    path('chats/user-chats/', chat_views.get_user_chat_list, name='get_user_chat_list'),
]
