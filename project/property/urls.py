from django.urls import path
from . import views

urlpatterns = [
    path('user-properties/', views.get_user_properties, name='user_properties'),
    path('property/<str:property_id>/', views.get_property_details, name='property_details'),
    path('property/flag-sale/', views.flag_property_for_sale, name='flag_property_for_sale'),
    path('marketplace/', views.get_marketplace_properties, name='marketplace_properties'),
    path('user-profile/', views.get_user_profile, name='user_profile'),
    path('dev/seed/', views.dev_seed_data, name='dev_seed_data'),
]
