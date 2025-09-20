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


def find_user_by_wallet(wallet_address):
    """
    Find a user document by wallet address in 'app-users'.
    Handles schema variants: 'wallet_adrdess', 'wallet', 'Wallet', 'wallet_address', 'walletAddress'.
    Tries both the provided value and its lowercase form, to be resilient to case differences.
    Returns the first matching document or None.
    """
    if not wallet_address:
        return None
    # Try each field name variant
    field_variants = [
        "wallet_adrdess",
        "wallet",
        "Wallet",
        "wallet_address",
        "walletAddress",
    ]
    candidates = [wallet_address]
    try:
        wl = str(wallet_address)
        if wl.lower() != wl:
            candidates.append(wl.lower())
    except Exception:
        pass
    for field in field_variants:
        for val in candidates:
            try:
                selector = {field: {"$eq": val}}
                resp = service.post_find(db="app-users", selector=selector).get_result()
                docs = resp.get("docs", [])
                if docs:
                    return docs[0]
            except Exception as e:
                print(f"find_user_by_wallet error for field {field} value {val}: {e}")
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

# Register for Sale database functions
def insert_property_for_sale(property_id, asking_price, wallet_address=None):
    """
    Insert a property into the registered_for_sale database.
    This will be used to track properties available in the marketplace.
    """
    from datetime import datetime
    sale_doc = {
        "property_id": property_id,
        "asking_price": asking_price,
        "wallet_address": wallet_address,
        "listed_date": datetime.now().isoformat(),  # Set current date/time
        "status": "active"
    }
    
    try:
        response = service.post_document(db="registered_for_sale", document=sale_doc).get_result()
        return response
    except Exception as e:
        print(f"Error inserting property for sale: {e}")
        return {"error": str(e)}

def get_all_properties_for_sale():
    """
    Get all active properties from the registered_for_sale database.
    """
    try:
        selector = {"status": {"$eq": "active"}}
        response = service.post_find(db="registered_for_sale", selector=selector).get_result()
        return response.get("docs", [])
    except Exception as e:
        print(f"Error fetching properties for sale: {e}")
        return []

def remove_property_from_sale(property_id):
    """
    Remove a property from sale by marking it as inactive or deleting the record.
    """
    try:
        # Find the document first
        selector = {"property_id": {"$eq": property_id}}
        response = service.post_find(db="registered_for_sale", selector=selector).get_result()
        docs = response.get("docs", [])
        
        if docs:
            doc = docs[0]
            doc["status"] = "sold"  # Mark as sold instead of deleting
            update_response = service.post_document(db="registered_for_sale", document=doc).get_result()
            return update_response
        else:
            return {"error": "Property not found in sale listings"}
    except Exception as e:
        print(f"Error removing property from sale: {e}")
        return {"error": str(e)}

def get_property_sale_details(property_id):
    """
    Get sale details for a specific property from registered_for_sale database.
    """
    try:
        selector = {
            "property_id": {"$eq": property_id},
            "status": {"$eq": "active"}
        }
        # Primary: registered_for_sale (consistent with insertion)
        try:
            response = service.post_find(db="registered_for_sale", selector=selector).get_result()
            docs = response.get("docs", [])
            if docs:
                return docs[0]
        except Exception as e1:
            print(f"get_property_sale_details primary query error: {e1}")
        # Fallback: legacy register-for-sale
        response2 = service.post_find(db="register-for-sale", selector=selector).get_result()
        docs2 = response2.get("docs", [])
        return docs2[0] if docs2 else None
    except Exception as e:
        print(f"Error fetching property sale details: {e}")
        return None

# Chat system functions
def create_or_get_chat(property_id, buyer_email, seller_email):
    """
    Create a new chat or get existing chat between buyer and seller for a property.
    Returns the chat document.
    """
    from datetime import datetime
    
    try:
        # First try to find existing chat
        selector = {
            "property_id": {"$eq": property_id},
            "participants": {
                "$all": [buyer_email, seller_email]
            }
        }
        response = service.post_find(db="property-chats", selector=selector).get_result()
        existing_chats = response.get("docs", [])
        
        if existing_chats:
            return existing_chats[0]
        
        # Create new chat if none exists
        chat_doc = {
            "property_id": property_id,
            "participants": [buyer_email, seller_email],
            "buyer_email": buyer_email,
            "seller_email": seller_email,
            "created_at": datetime.now().isoformat(),
            "last_message_at": datetime.now().isoformat(),
            "status": "active"
        }
        
        create_response = service.post_document(db="property-chats", document=chat_doc).get_result()
        chat_doc["_id"] = create_response.get("id")
        chat_doc["_rev"] = create_response.get("rev")
        return chat_doc
        
    except Exception as e:
        print(f"Error creating/getting chat: {e}")
        return {"error": str(e)}

def send_message(chat_id, sender_email, message_text):
    """
    Send a message in a chat. Messages are stored in a separate 'chat-messages' database.
    """
    from datetime import datetime
    
    try:
        message_doc = {
            "chat_id": chat_id,
            "sender_email": sender_email,
            "message_text": message_text,
            "timestamp": datetime.now().isoformat(),
            "read": False
        }
        
        response = service.post_document(db="chat-messages", document=message_doc).get_result()
        
        # Update the chat's last_message_at timestamp
        try:
            chat_doc = service.get_document(db="property-chats", doc_id=chat_id).get_result()
            chat_doc["last_message_at"] = datetime.now().isoformat()
            service.post_document(db="property-chats", document=chat_doc)
        except Exception as chat_update_error:
            print(f"Error updating chat timestamp: {chat_update_error}")
        
        message_doc["_id"] = response.get("id")
        message_doc["_rev"] = response.get("rev")
        return message_doc
        
    except Exception as e:
        print(f"Error sending message: {e}")
        return {"error": str(e)}

def get_chat_messages(chat_id, limit=50):
    """
    Get all messages for a specific chat, ordered by timestamp.
    """
    try:
        selector = {
            "chat_id": {"$eq": chat_id}
        }
        
        # Sort by timestamp ascending (oldest first)
        sort = [{"timestamp": "asc"}]
        
        response = service.post_find(
            db="chat-messages", 
            selector=selector, 
            sort=sort,
            limit=limit
        ).get_result()
        
        return response.get("docs", [])
        
    except Exception as e:
        print(f"Error fetching chat messages: {e}")
        return []

def get_user_chats(user_email):
    """
    Get all chats for a user (both as buyer and seller).
    """
    try:
        selector = {
            "participants": {
                "$in": [user_email]
            },
            "status": {"$eq": "active"}
        }
        
        # Sort by last_message_at descending (most recent first)
        sort = [{"last_message_at": "desc"}]
        
        response = service.post_find(
            db="property-chats", 
            selector=selector, 
            sort=sort
        ).get_result()
        
        return response.get("docs", [])
        
    except Exception as e:
        print(f"Error fetching user chats: {e}")
        return []

def get_chat_by_id(chat_id):
    """
    Get a specific chat by its ID.
    """
    try:
        response = service.get_document(db="property-chats", doc_id=chat_id).get_result()
        return response
    except Exception as e:
        print(f"Error fetching chat by ID: {e}")
        return None

def mark_messages_as_read(chat_id, reader_email):
    """
    Mark all messages in a chat as read for a specific user.
    """
    try:
        # Get all unread messages in the chat that are NOT from the reader
        selector = {
            "chat_id": {"$": "eq", "eq": chat_id} if False else {"$eq": chat_id},
            "read": {"$eq": False},
            "sender_email": {"$ne": reader_email}
        }
        
        response = service.post_find(db="chat-messages", selector=selector).get_result()
        messages = response.get("docs", [])
        
        # Mark each message as read
        for message in messages:
            message["read"] = True
            service.post_document(db="chat-messages", document=message)
        
        return len(messages)
        
    except Exception as e:
        print(f"Error marking messages as read: {e}")
        return 0

# ----------------------- Transaction helpers -----------------------

def get_wallet_from_user_doc(user_doc):
    return (
        user_doc.get("wallet_adrdess")
        or user_doc.get("wallet")
        or user_doc.get("Wallet")
        or user_doc.get("wallet_address")
        or user_doc.get("walletAddress")
    )

def get_prop_docs(property_id):
    """
    Retrieve property documents metadata from 'prop-docs' database by property_id.
    Expected fields: { "property_id": str, "gdrive_link": str }
    """
    try:
        resp = service.post_find(db="prop-docs", selector={"property_id": {"$eq": property_id}}).get_result()
        docs = resp.get("docs", [])
        return docs[0] if docs else None
    except Exception as e:
        print(f"Error fetching prop-docs for {property_id}: {e}")
        return None


def assign_random_surveyor():
    """
    Pick a surveyor from govt-citizen where role != 'USER'.
    Returns a minimal dict with email and name if available.
    """
    try:
        selector = {"role": {"$ne": "USER"}}
        resp = service.post_find(db="govt-citizen", selector=selector).get_result()
        docs = resp.get("docs", [])
        if not docs:
            return None
        d = docs[0]
        return {
            "email": d.get("Email") or d.get("email"),
            "name": d.get("Name") or d.get("name"),
            "raw": d,
        }
    except Exception as e:
        print(f"Error assigning surveyor: {e}")
        return None


def create_transaction_doc(property_id, seller_email, buyer_email, status, seller_wallet=None, buyer_wallet=None, docs_link=None, surveyor_email=None):
    from datetime import datetime
    tx = {
        "property_id": property_id,
        "seller_email": seller_email,
        "buyer_email": buyer_email,
        "seller_wallet": seller_wallet,
        "buyer_wallet": buyer_wallet,
        "status": status,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "surveyor_email": surveyor_email,
        "docs_link": docs_link,
        "officer_details": None,
    }
    try:
        resp = service.post_document(db="in-transaction", document=tx).get_result()
        tx["_id"] = resp.get("id")
        tx["_rev"] = resp.get("rev")
        return tx
    except Exception as e:
        print(f"Error creating transaction: {e}")
        return {"error": str(e)}


def get_transaction_by_id(tx_id):
    try:
        return service.get_document(db="in-transaction", doc_id=tx_id).get_result()
    except Exception as e:
        print(f"Error fetching transaction {tx_id}: {e}")
        return None


def update_transaction_doc(tx_doc):
    from datetime import datetime
    tx_doc["updated_at"] = datetime.now().isoformat()
    try:
        resp = service.post_document(db="in-transaction", document=tx_doc).get_result()
        tx_doc["_rev"] = resp.get("rev")
        return tx_doc
    except Exception as e:
        print(f"Error updating transaction: {e}")
        return {"error": str(e)}

