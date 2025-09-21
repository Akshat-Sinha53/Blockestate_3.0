from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import json

from project.utils.cloudant_client import find_properties_by_wallet, get_property_by_id, get_all_properties, find_user_by_email, insert_doc, find_app_user_by_aadhaar, update_property, insert_property_for_sale, get_all_properties_for_sale, remove_property_from_sale, unlist_property_from_sale

@csrf_exempt
def get_user_properties(request):
    """
    Get all properties owned by a user based on their wallet address
    """
    if request.method == "GET":
        wallet_address = request.GET.get("wallet_address")
        
        if not wallet_address:
            return JsonResponse({"success": False, "message": "Wallet address is required"})
        
        try:
            properties = find_properties_by_wallet(wallet_address)
            return JsonResponse({
                "success": True, 
                "properties": properties,
                "count": len(properties)
            })
        except Exception as e:
            print(f"Error fetching properties for wallet {wallet_address}: {e}")
            return JsonResponse({"success": False, "message": "Error fetching properties"})

@csrf_exempt
def get_property_details(request, property_id):
    """
    Get detailed information about a specific property
    """
    if request.method == "GET":
        try:
            property_data = get_property_by_id(property_id)
            
            if property_data:
                return JsonResponse({
                    "success": True,
                    "property": property_data
                })
            else:
                return JsonResponse({"success": False, "message": "Property not found"})
                
        except Exception as e:
            print(f"Error fetching property {property_id}: {e}")
            return JsonResponse({"success": False, "message": "Error fetching property details"})

@csrf_exempt
def flag_property_for_sale(request):
    """
    Mark a property as listed for sale with a given price.
    Constraints: price must be <= property 'value' (parsed) if available.
    Body: { "property_id": str, "price": number }
    
    This now inserts the property into the 'register-for-sale' database
    which will be used by the marketplace to show available properties.
    """
    if request.method == "POST":
        try:
            body = json.loads(request.body.decode('utf-8')) if request.body else {}
        except Exception:
            body = {}
        property_id = body.get("property_id")
        price = body.get("price")
        if not property_id or price is None:
            return JsonResponse({"success": False, "message": "property_id and price are required"}, status=400)
        try:
            price_num = float(price)
        except Exception:
            return JsonResponse({"success": False, "message": "price must be a number"}, status=400)
        try:
            # Get the original property to validate and get details
            prop = get_property_by_id(property_id)
            if not prop:
                return JsonResponse({"success": False, "message": "Property not found"}, status=404)
            
            # Parse max value for validation
            raw_val = prop.get("value") or prop.get("total_area") or prop.get("total area") or prop.get("Total Area")
            max_val = None
            if isinstance(raw_val, (int, float)):
                max_val = float(raw_val)
            elif isinstance(raw_val, str):
                digits = "".join(ch for ch in raw_val if (ch.isdigit() or ch == '.'))
                if digits:
                    try:
                        max_val = float(digits)
                    except Exception:
                        max_val = None
            
            # Enforce price cap if we could determine a value
            if max_val is not None and price_num > max_val:
                return JsonResponse({"success": False, "message": f"Price cannot exceed property value ({max_val})."}, status=400)
            
            # Get wallet address from property
            wallet_address = prop.get("wallet") or prop.get("wallet_address")
            
            # Insert into register-for-sale database
            from datetime import datetime
            sale_result = insert_property_for_sale(
                property_id=property_id,
                asking_price=price_num,
                wallet_address=wallet_address
            )
            
            if "error" in sale_result:
                return JsonResponse({"success": False, "message": f"Failed to register for sale: {sale_result['error']}"}, status=500)
            
            # Also update the original property document to mark as listed
            prop["listed_for_sale"] = True
            prop["asking_price"] = price_num
            prop["status"] = "FOR_SALE"
            update_property(prop)
            
            return JsonResponse({
                "success": True, 
                "message": "Property successfully listed for sale",
                "property_id": property_id,
                "asking_price": price_num,
                "sale_record": sale_result
            })
            
        except Exception as e:
            print(f"Error flagging property for sale: {e}")
            return JsonResponse({"success": False, "message": "Error flagging property"}, status=500)

@csrf_exempt
def get_marketplace_properties(request):
    """
    Get all properties for marketplace view (public listing)
    Fetches from register-for-sale database and enriches with property details
    """
    if request.method == "GET":
        try:
            # Get all properties listed for sale from register-for-sale database
            sale_listings = get_all_properties_for_sale()
            
            # Enrich each sale listing with full property details
            marketplace_properties = []
            for sale_listing in sale_listings:
                property_id = sale_listing.get("property_id")
                if property_id:
                    # Get full property details from property-details database
                    property_details = get_property_by_id(property_id)
                    if property_details:
                        # Combine sale info with property details
                        enriched_property = {
                            **property_details,  # All original property data
                            "asking_price": sale_listing.get("asking_price"),
                            "listed_date": sale_listing.get("listed_date"),
                            "sale_status": sale_listing.get("status", "active"),
                            "listed_for_sale": True,
                            "status": "FOR_SALE"
                        }
                        marketplace_properties.append(enriched_property)
                    else:
                        print(f"Warning: Property details not found for property_id: {property_id}")
                        # Still include basic sale info even if details missing
                        marketplace_properties.append({
                            "property_id": property_id,
                            "asking_price": sale_listing.get("asking_price"),
                            "listed_date": sale_listing.get("listed_date"),
                            "sale_status": sale_listing.get("status", "active"),
                            "listed_for_sale": True,
                            "status": "FOR_SALE",
                            "title": f"Property {property_id}",
                            "location": "Details unavailable",
                            "type": "Unknown"
                        })
            
            return JsonResponse({
                "success": True,
                "properties": marketplace_properties,
                "count": len(marketplace_properties)
            })
            
        except Exception as e:
            print(f"Error fetching marketplace properties: {e}")
            return JsonResponse({"success": False, "message": "Error fetching marketplace properties"})

@csrf_exempt
def unlist_property(request):
    """
    Unlist a property from sale by marking its listing inactive and clearing flags on the property document.
    Body: { "property_id": str }
    """
    if request.method == "POST":
        try:
            body = json.loads(request.body.decode('utf-8')) if request.body else {}
        except Exception:
            body = {}
        property_id = body.get("property_id")
        if not property_id:
            return JsonResponse({"success": False, "message": "property_id is required"}, status=400)
        try:
            # Mark listing inactive in registered_for_sale DB
            res = unlist_property_from_sale(property_id)
            if isinstance(res, dict) and res.get("error"):
                # If not found, still proceed to clear flags on property doc
                pass
            # Update original property document flags if exists
            prop = get_property_by_id(property_id)
            if prop:
                prop["listed_for_sale"] = False
                prop.pop("asking_price", None)
                # Reset status if it was FOR_SALE
                if (prop.get("status") or "").upper() == "FOR_SALE":
                    prop["status"] = "OWNED"
                update_property(prop)
            return JsonResponse({"success": True, "message": "Property unlisted successfully"})
        except Exception as e:
            print(f"Error unlisting property: {e}")
            return JsonResponse({"success": False, "message": "Error unlisting property"}, status=500)

@csrf_exempt
def dev_seed_data(request):
    """
    DEV ONLY: Seed one user and one property into Cloudant so the flow can be tested.
    Only allowed when DEBUG=True.
    """
    if request.method == "POST":
        if not settings.DEBUG:
            return JsonResponse({"success": False, "message": "Not allowed"}, status=403)
        try:
            body = json.loads(request.body.decode('utf-8')) if request.body else {}
        except Exception:
            body = {}

        # Defaults (can be overridden via body)
        email = body.get("Email") or body.get("email") or "sneha.iyer@example.com"
        wallet = body.get("wallet") or "nb324k32j4jb332"
        property_id = body.get("property_id") or "P-001"

        # Seed user in app-users and govt-citizen for OTP lookup
        aadhaar_val = body.get("Aadhaar") or body.get("aadhaar") or "752901193601"
        user_doc = {
            "Email": email,
            "wallet_adrdess": wallet,
            "Name": "Sneha Iyer",
            "Aadhaar": aadhaar_val,
            "Pan": "UVWXY6789R",
        }
        try:
            insert_doc(db_name="app-users", doc=user_doc)
        except Exception as e:
            print(f"Seed user insert error (app-users): {e}")
        try:
            insert_doc(db_name="govt-citizen", doc={"Aadhaar": aadhaar_val, "Email": email})
        except Exception as e:
            print(f"Seed user insert error (govt-citizen): {e}")

        # Seed property in property-details
        prop_doc = {
            "property_id": property_id,
            "wallet": wallet,
            "plot_number": "24",
            "Village": "Marina",
            "District": "Chennai",
            "State": "Tamil Nadu",
            "Category": "Residential",
            "Current_use": "Residential",
            "total area": "1200 sqft",
        }
        try:
            insert_doc(db_name="property-details", doc=prop_doc)
        except Exception as e:
            print(f"Seed property insert error: {e}")

        return JsonResponse({"success": True, "user": user_doc, "property": prop_doc})

@csrf_exempt
def get_user_profile(request):
    """
    Get user profile information including wallet details, looked up by email.
    """
    if request.method == "POST":
        try:
            if request.body:
                body = json.loads(request.body.decode('utf-8'))
            else:
                body = {}
        except Exception:
            body = {}
        email = body.get("email") or body.get("Email") or request.POST.get("email") or request.GET.get("email")
        
        if not email:
            return JsonResponse({"success": False, "message": "Email is required"})
        
        try:
            user_doc = find_user_by_email(email)
            if not user_doc:
                return JsonResponse({"success": False, "message": "User not found"})
            
            # Schema uses 'wallet_adrdess' (as provided). Try common variants as fallback.
            wallet_address = (
                user_doc.get("wallet_adrdess")
                or user_doc.get("wallet")
                or user_doc.get("Wallet")
                or user_doc.get("wallet_address")
                or user_doc.get("walletAddress")
            )
            
            # Map of possible fields to return on the dashboard (gracefully handle missing)
            user_data = {
                "email": user_doc.get("Email") or email,
                "wallet_address": wallet_address,
                "Name": user_doc.get("Name"),
                "FatherName": user_doc.get("FatherName"),
                "MotherName": user_doc.get("MotherName"),
                "DoB": user_doc.get("DoB"),
                "Gender": user_doc.get("Gender"),
                "Age": user_doc.get("Age"),
                "ContactNo": user_doc.get("ContactNo"),
                "Address": user_doc.get("Address"),
                "Aadhaar": user_doc.get("Aadhaar"),
                "Pan": user_doc.get("Pan"),
                "Nationality": user_doc.get("Nationality"),
                "properties_count": 0,
            }
            
            # If wallet not present on this doc, try to find it from app-users using Aadhaar
            if not wallet_address:
                aad = user_doc.get("Aadhaar")
                if aad:
                    try:
                        app_user = find_app_user_by_aadhaar(aad)
                        if app_user:
                            wallet_address = (
                                app_user.get("wallet_adrdess")
                                or app_user.get("wallet")
                                or app_user.get("Wallet")
                                or app_user.get("wallet_address")
                                or app_user.get("walletAddress")
                            )
                            user_data["wallet_address"] = wallet_address
                    except Exception as _:
                        pass

            if wallet_address:
                properties = find_properties_by_wallet(wallet_address)
                user_data["properties_count"] = len(properties)
            
            return JsonResponse({
                "success": True,
                "user": user_data
            })
            
        except Exception as e:
            print(f"Error fetching user profile: {e}")
            return JsonResponse({"success": False, "message": "Error fetching user profile"})
