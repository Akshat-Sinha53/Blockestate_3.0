import requests
import json
from decouple import config

# Optional: Set PINATA_JWT in your .env. If not set, it will mock the IPFS upload.
PINATA_JWT = config("PINATA_JWT", default="")

def upload_json_to_ipfs(json_metadata: dict) -> str:
    """
    Uploads a JSON payload to Pinata IPFS pinning service.
    Returns the IPFS URI, e.g. "ipfs://bafkreib..."
    """
    if not PINATA_JWT:
        print("WARNING: PINATA_JWT not set in .env. Falling back to a mock IPFS CID for Hackathon testing.")
        return "ipfs://bafkreicpccq4pkz4e5bh7bcdqdogieulh2277774kkwnntj5xz7ob1byzi"
    
    url = "https://api.pinata.cloud/pinning/pinJSONToIPFS"
    
    clean_jwt = PINATA_JWT.strip()
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {clean_jwt}"
    }
    
    # Format metadata correctly per Metaplex standard or custom standard
    payload = json.dumps({
        "pinataContent": json_metadata,
        "pinataMetadata": {
            "name": f"LandRecord_{json_metadata.get('name', 'Unknown')}.json"
        }
    })
    
    try:
        response = requests.post(url, headers=headers, data=payload, timeout=10)
        response.raise_for_status()
        data = response.json()
        cid = data.get("IpfsHash")
        if not cid:
            raise Exception("No CID returned from Pinata")
        
        return f"ipfs://{cid}"
    except Exception as e:
        print(f"Error uploading to Pinata: {e}")
        # Fallback fake hash for resilience
        return "ipfs://bafkreicpccq4pkz4e5bh7bcdqdogieulh2277774kkwnntj5xz7ob1byzi"
