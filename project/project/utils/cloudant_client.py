import requests
from decouple import config

SUPABASE_URL = config("SUPABASE_URL", default="").rstrip("/")
SUPABASE_KEY = config("SUPABASE_KEY", default="")
BASE_URL = f"{SUPABASE_URL}/rest/v1" if SUPABASE_URL else ""

def get_headers(prefer="return=representation"):
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": prefer
    }

def get_table_name(db_name: str):
    mapping = {
        "app-users": "app_users",
        "govt-citizen": "govt_citizens",
        "property-details": "property_details",
        "registered_for_sale": "registered_for_sale",
        "property-chats": "property_chats",
        "chat-messages": "chat_messages",
        "in-transaction": "in_transaction",
        "prop-docs": "prop_docs",
        "register-for-sale": "registered_for_sale",
    }
    return mapping.get(db_name, db_name.replace('-', '_'))

def add_cloudant_id(d):
    if not isinstance(d, dict): return d
    if "id" in d:
        d["_id"] = str(d["id"])
        d["_rev"] = "supabase-static-rev"
    if "email" in d and "Email" not in d: d["Email"] = d["email"]
    if "name" in d and "Name" not in d: d["Name"] = d["name"]
    
    # Map lowercase DB columns to the specific casing expected by the User Profile frontend
    user_map = {
        "father_name": "FatherName",
        "mother_name": "MotherName",
        "dob": "DoB",
        "gender": "Gender",
        "age": "Age",
        "contact_no": "ContactNo",
        "address": "Address",
        "aadhaar": "Aadhaar",
        "pan": "Pan",
        "nationality": "Nationality",
    }
    for k, v in user_map.items():
        if k in d and v not in d: d[v] = d[k]
        
    # Map lowercase DB columns to specific casing expected by Property View frontend
    prop_map = {
        "village": "Village",
        "district": "District",
        "state": "State",
        "frontage": "Frontage",
        "depth": "Depth",
        "current_use": "Current_use",
        "category": "Category",
        "khata_no": "Khata_no",
        "total_area": "total area" # Legacy fallback just in case
    }
    for k, v in prop_map.items():
        if k in d and v not in d: d[v] = d[k]
        
    return d

def _select(table, params=None):
    if not BASE_URL: return []
    resp = requests.get(f"{BASE_URL}/{table}", headers=get_headers(), params=params)
    if resp.status_code == 200:
        return [add_cloudant_id(r) for r in resp.json()]
    return []

def _insert(table, data, prefer="return=representation"):
    if not BASE_URL: return {"error": "no credentials"}
    resp = requests.post(f"{BASE_URL}/{table}", headers=get_headers(prefer=prefer), json=data, timeout=5)
    if resp.status_code in (200, 201):
        try:
            j = resp.json()
            return add_cloudant_id(j[0]) if isinstance(j, list) and j else {}
        except:
            return {}
    return {"error": f"insert failed: {resp.text}"}

def _update(table, match_col, match_val, data):
    if not BASE_URL: return {"error": "no credentials"}
    params = {f"{match_col}": f"eq.{match_val}"}
    resp = requests.patch(f"{BASE_URL}/{table}", headers=get_headers(), params=params, json=data)
    if resp.status_code in (200, 204):
        try:
            j = resp.json()
            return add_cloudant_id(j[0]) if isinstance(j, list) and j else {}
        except:
            return {}
    return {"error": f"update failed: {resp.text}"}

# --- Cloudant Mappings ---
def ensure_db(db_name: str): pass
def ensure_index(db_name: str, fields, name: str | None = None): pass
def list_databases(): return []

def get_all_docs(db_name="app-users"):
    table = get_table_name(db_name)
    rows = _select(table)
    return {"rows": [{"doc": d} for d in rows]}

def get_doc_by_id(db_name="app-users", doc_id="user:1"):
    table = get_table_name(db_name)
    rows = _select(table, {"id": f"eq.{doc_id}"})
    return rows[0] if rows else None

def insert_doc(db_name="app-users", doc=None):
    if not doc: return {"error": "No document"}
    d = dict(doc)
    d.pop("_id", None)
    d.pop("_rev", None)
    return _insert(get_table_name(db_name), d)

def find_user_by_aadhaar(aadhaar):
    raw = str(aadhaar)
    digits = "".join(ch for ch in raw if ch.isdigit())
    hyph = f"{digits[0:4]}-{digits[4:8]}-{digits[8:12]}" if len(digits) == 12 else None
    
    for val in [raw, digits, hyph]:
        if not val: continue
        rows = _select("govt_citizens", {"aadhaar": f"eq.{val}"})
        if rows: return rows[0]
    return None

def find_user_by_pan(pan):
    rows = _select("app_users", {"pan": f"eq.{pan}"})
    return rows[0] if rows else None

def find_app_user_by_aadhaar(aadhaar):
    rows = _select("app_users", {"aadhaar": f"eq.{aadhaar}"})
    return rows[0] if rows else None

def find_user_by_email(email):
    rows = _select("app_users", {"email": f"eq.{email}"})
    if rows: return rows[0]
    rows = _select("govt_citizens", {"email": f"eq.{email}"})
    return rows[0] if rows else None

def find_user_by_wallet(wallet_address):
    if not wallet_address: return None
    variants = [wallet_address, wallet_address.lower()]
    for table in ["app_users", "govt_citizens"]:
        for val in variants:
            rows = _select(table, {"wallet_address": f"eq.{val}"})
            if rows: return rows[0]
    return None

def find_properties_by_wallet(wallet_address):
    return _select("property_details", {"wallet": f"eq.{wallet_address}"})

def get_property_by_id(property_id):
    rows = _select("property_details", {"id": f"eq.{property_id}"})
    if rows: return rows[0]
    rows = _select("property_details", {"property_id": f"eq.{property_id}"})
    return rows[0] if rows else None

def get_all_properties():
    rows = _select("property_details")
    return {"rows": [{"doc": d} for d in rows]}

def insert_property(property_data):
    if not property_data: return {"error": "No data"}
    d = dict(property_data)
    d.pop("_id", None)
    d.pop("_rev", None)
    return _insert("property_details", d)

def update_property(property_data):
    if not property_data: return {"error": "No data"}
    d = dict(property_data)
    i = d.pop("_id", None) or d.pop("id", None) or d.get("property_id")
    d.pop("_rev", None)
    if not i: return {"error": "Missing _id"}
    match_col = "property_id" if d.get("property_id") else "id"
    return _update("property_details", match_col, i, d)

def insert_property_for_sale(property_id, asking_price, wallet_address=None):
    from datetime import datetime
    d = {
        "property_id": property_id,
        "asking_price": asking_price,
        "wallet_address": wallet_address,
        "listed_date": datetime.now().isoformat(),
        "status": "active"
    }
    return _insert("registered_for_sale", d)

def get_all_properties_for_sale():
    return _select("registered_for_sale", {"status": "eq.active"})

def remove_property_from_sale(property_id):
    return _update("registered_for_sale", "property_id", property_id, {"status": "sold"})

def unlist_property_from_sale(property_id):
    return _update("registered_for_sale", "property_id", property_id, {"status": "inactive"})

def get_property_sale_details(property_id):
    rows = _select("registered_for_sale", {"property_id": f"eq.{property_id}", "status": "eq.active"})
    return rows[0] if rows else None

# --- Chat System ---
def create_or_get_chat(property_id, buyer_email, seller_email):
    b = buyer_email.strip().lower() if isinstance(buyer_email, str) else buyer_email
    s = seller_email.strip().lower() if isinstance(seller_email, str) else seller_email
    
    rows = _select("property_chats", {
        "property_id": f"eq.{property_id}",
        "participants": f"cs.{{{b},{s}}}"
    })
    if rows: return rows[0]
    
    import uuid
    from datetime import datetime
    d = {
        "id": str(uuid.uuid4()), # Explicit ID generation!
        "property_id": property_id,
        "participants": [b, s],
        "buyer_email": b,
        "seller_email": s,
        "status": "active",
        "created_at": datetime.now().isoformat(),
        "last_message_at": datetime.now().isoformat()
    }
    return _insert("property_chats", d)

def send_message(chat_id, sender_email, message_text):
    import uuid
    import threading
    s = sender_email.strip().lower() if isinstance(sender_email, str) else sender_email
    from datetime import datetime
    now_iso = datetime.now().isoformat()
    msg_id = str(uuid.uuid4())
    d = {
        "id": msg_id, # Explicit ID generation!
        "chat_id": chat_id,
        "sender_email": s,
        "message_text": message_text,
        "timestamp": now_iso,
        "read": False
    }
    
    # 1. Fire and forget the message insert (don't wait for heavy DB serialization)
    threading.Thread(target=_insert, args=("chat_messages", d, "return=minimal"), daemon=True).start()
    
    # 2. Fire and forget the chat timestamp update
    threading.Thread(target=_update, args=("property_chats", "id", chat_id, {"last_message_at": now_iso}), daemon=True).start()
    
    # 3. Immediately return the optimistic payload back to the frontend!
    return {
        "_id": msg_id,
        "chat_id": chat_id,
        "sender_email": s,
        "message_text": message_text,
        "timestamp": now_iso
    }

def get_chat_messages(chat_id, limit=50):
    params = {"chat_id": f"eq.{chat_id}", "order": "timestamp.asc", "limit": str(limit)}
    return _select("chat_messages", params)

def get_user_chats(user_email):
    u = user_email.strip().lower() if isinstance(user_email, str) else user_email
    params = {
        "participants": f"cs.{{{u}}}",
        "status": "eq.active",
        "order": "last_message_at.desc"
    }
    return _select("property_chats", params)

def get_chat_by_id(chat_id):
    rows = _select("property_chats", {"id": f"eq.{chat_id}"})
    return rows[0] if rows else None

def mark_messages_as_read(chat_id, reader_email):
    r = reader_email.strip().lower() if isinstance(reader_email, str) else reader_email
    if not BASE_URL: return 0
    params = {
        "chat_id": f"eq.{chat_id}",
        "read": "eq.false",
        "sender_email": f"neq.{r}"
    }
    h = get_headers()
    resp = requests.patch(f"{BASE_URL}/chat_messages", headers=h, params=params, json={"read": True})
    return len(resp.json()) if resp.status_code == 200 and isinstance(resp.json(), list) else 0

def get_wallet_from_user_doc(user_doc):
    return (
        user_doc.get("wallet_address")
        or user_doc.get("wallet")
        or user_doc.get("Wallet")
        or user_doc.get("wallet_adrdess")
        or user_doc.get("walletAddress")
    )

def get_prop_docs(property_id):
    rows = _select("prop_docs", {"property_id": f"eq.{property_id}"})
    return rows[0] if rows else None

def assign_random_surveyor():
    rows = _select("govt_citizens", {"role": "neq.USER"})
    if rows:
        d = rows[0]
        return {"email": d.get("email"), "name": d.get("name"), "raw": d}
    return None

def create_transaction_doc(property_id, seller_email, buyer_email, status, seller_wallet=None, buyer_wallet=None, docs_link=None, surveyor_email=None):
    from datetime import datetime
    import uuid
    doc = {
        "id": str(uuid.uuid4()), # Explicit ID generation!
        "property_id": property_id,
        "seller_email": seller_email,
        "buyer_email": buyer_email,
        "seller_wallet": seller_wallet,
        "buyer_wallet": buyer_wallet,
        "status": status,
        "surveyor_email": surveyor_email,
        "docs_link": docs_link,
        "officer_details": None,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }
    return _insert("in_transaction", doc)

def get_transaction_by_id(tx_id):
    rows = _select("in_transaction", {"id": f"eq.{tx_id}"})
    return rows[0] if rows else None

def update_transaction_doc(tx_doc):
    d = dict(tx_doc)
    i = d.pop("_id", None) or d.pop("id", None)
    d.pop("_rev", None)
    from datetime import datetime
    d["updated_at"] = datetime.now().isoformat()
    return _update("in_transaction", "id", i, d)

def find_transactions_for_user(user_email, role=None, status=None):
    e = str(user_email).lower() if user_email else ""
    params = {"order": "updated_at.desc"}
    if role == 'seller':
        params["seller_email"] = f"eq.{e}"
    elif role == 'buyer':
        params["buyer_email"] = f"eq.{e}"
    else:
        params["or"] = f"(seller_email.eq.{e},buyer_email.eq.{e})"
        
    if status:
        params["status"] = f"eq.{status}"
    return _select("in_transaction", params)
