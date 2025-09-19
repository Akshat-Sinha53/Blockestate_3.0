from django.urls import path
from .views import verify_aadhaar_pan, verify_otp , test_form

urlpatterns = [
    path("verify/", verify_aadhaar_pan),
    path("verify-otp/", verify_otp),
    path("testform/", test_form, name="test_form"),
]
