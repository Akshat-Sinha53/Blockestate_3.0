from ibmcloudant.cloudant_v1 import CloudantV1
from ibm_cloud_sdk_core.authenticators import IAMAuthenticator

from django.conf import settings

authenticator = IAMAuthenticator(settings.CLOUDANT["apikey"])
service = CloudantV1(authenticator=authenticator)

service.set_service_url(settings.CLOUDANT["url"])

# Quick test
def list_databases():
    response = service.get_all_dbs().get_result()
    return response


def get_all_docs(db_name="app-users"):
    response = service.post_all_docs(db=db_name, include_docs=True).get_result()
    return response

def get_doc_by_id(db_name="app-users", doc_id="user:1"):
    response = service.get_document(db=db_name, doc_id=doc_id).get_result()
    return response

def insert_doc(db_name="app-users", doc=None):
    if not doc:
        return {"error": "No document provided"}
    
    response = service.post_document(db=db_name, document=doc).get_result()
    return response

#  "doc": {"_id":"91360b492abfec7472ec3f5b9db489de","_rev": "2-8a19bc5cfbf955267aadbe22e6ffefa4","first_name":"Shambhavi","last_name": "Rani","email": "student.st.rani@gmail.com","aadhaar_number":"123456789012","pan_number": "SSQER2726S","phone": 7482877340,"role": "USER","wallet_address":"0xabc123..."}

def find_user_by_aadhaar(aadhaar):
    """
    Find user by Aadhaar in 'govt-citizen'. Accepts either 12 digits or xxxx-xxxx-xxxx format.
    Tries multiple selectors to be lenient.
    """
    # Raw value
    raw = str(aadhaar)
    # Normalized: remove non-digits
    digits = "".join(ch for ch in raw if ch.isdigit())
    # Hyphenated (xxxx-xxxx-xxxx)
    hyph = None
    if len(digits) == 12:
        hyph = f"{digits[0:4]}-{digits[4:8]}-{digits[8:12]}"

    # Try exact 'Aadhaar' with provided raw
    try:
        selector = {"Aadhaar": {"$eq": raw}}
        response = service.post_find(db="govt-citizen", selector=selector).get_result()
        docs = response.get("docs", [])
        if docs:
            return docs[0]
    except Exception as e:
        print(f"find_user_by_aadhaar raw query error: {e}")

    # Try with digits (no hyphens)
    if digits and digits != raw:
        try:
            selector = {"Aadhaar": {"$eq": digits}}
            response = service.post_find(db="govt-citizen", selector=selector).get_result()
            docs = response.get("docs", [])
            if docs:
                return docs[0]
        except Exception as e:
            print(f"find_user_by_aadhaar digits query error: {e}")

    # Try with hyphenated format
    if hyph and hyph not in (raw, digits):
        try:
            selector = {"Aadhaar": {"$eq": hyph}}
            response = service.post_find(db="govt-citizen", selector=selector).get_result()
            docs = response.get("docs", [])
            if docs:
                return docs[0]
        except Exception as e:
            print(f"find_user_by_aadhaar hyphenated query error: {e}")

    return None 

def find_user_by_pan(pan):
    selector = {"Pan": {"$eq": pan}}
    response = service.post_find(db="app-users", selector=selector).get_result()
    docs = response.get("docs", [])
    return docs[0] if docs else None


def find_app_user_by_aadhaar(aadhaar):
    """
    Find a user in 'app-users' by Aadhaar (for joining wallet when govt-citizen record lacks it)
    """
    selector = {"Aadhaar": {"$eq": aadhaar}}
    response = service.post_find(db="app-users", selector=selector).get_result()
    docs = response.get("docs", [])
    return docs[0] if docs else None

def find_user_by_email(email):
    """
    Try to find a user by email in known databases.
    Searches 'users' and 'govt-citizen'. Returns the first match or None.
    Uses 'Email' field per provided schema.
    """
    selector = {"Email": {"$eq": email}}
    # Search in 'app-users'
    try:
        resp_users = service.post_find(db="app-users", selector=selector).get_result()
        docs_users = resp_users.get("docs", [])
        if docs_users:
            return docs_users[0]
    except Exception as e:
        print(f"Error searching users by email in 'users' db: {e}")
    # Search in 'govt-citizen'
    try:
        resp_gc = service.post_find(db="govt-citizen", selector=selector).get_result()
        docs_gc = resp_gc.get("docs", [])
        if docs_gc:
            return docs_gc[0]
    except Exception as e:
        print(f"Error searching users by email in 'govt-citizen' db: {e}")
    return None

# Property management functions
def find_properties_by_wallet(wallet_address):
    """
    Find all properties owned by a wallet address.
    Uses 'wallet' field per provided schema.
    """
    selector = {"wallet": {"$eq": wallet_address}}
    response = service.post_find(db="property-details", selector=selector).get_result()
    return response.get("docs", [])

def get_property_by_id(property_id):
    """
    Get a specific property by its ID.
    First tries to fetch by Cloudant doc_id; if not found, tries a find by 'property_id' field.
    """
    try:
        response = service.get_document(db="property-details", doc_id=property_id).get_result()
        return response
    except Exception as e:
        print(f"Doc fetch by _id failed for {property_id}: {e}")
        # Fallback: search by domain field 'property_id' or legacy 'propert_id'
        try:
            # Try property_id first
            find_resp = service.post_find(db="property-details", selector={"property_id": {"$eq": property_id}}).get_result()
            docs = find_resp.get("docs", [])
            if docs:
                return docs[0]
            # Try propert_id (as seen in your data)
            find_resp2 = service.post_find(db="property-details", selector={"propert_id": {"$eq": property_id}}).get_result()
            docs2 = find_resp2.get("docs", [])
            return docs2[0] if docs2 else None
        except Exception as e2:
            print(f"Error fetching property by property_id/propert_id {property_id}: {e2}")
            return None

def get_all_properties():
    """
    Get all properties from the property registry
    """
    response = service.post_all_docs(db="property-details", include_docs=True).get_result()
    return response.get("rows", [])

def insert_property(property_data):
    """
    Insert a new property into the registry
    """
    if not property_data:
        return {"error": "No property data provided"}
    
    response = service.post_document(db="property-details", document=property_data).get_result()
    return response


def update_property(property_data):
    """
    Update an existing property (document must contain _id and _rev)
    """
    if not property_data or not property_data.get("_id"):
        return {"error": "Document with _id required"}
    response = service.post_document(db="property-details", document=property_data).get_result()
    return response
