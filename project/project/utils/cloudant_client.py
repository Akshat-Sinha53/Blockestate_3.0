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


def get_all_docs(db_name="users"):
    response = service.post_all_docs(db=db_name, include_docs=True).get_result()
    return response

def get_doc_by_id(db_name="users", doc_id="user:1"):
    response = service.get_document(db=db_name, doc_id=doc_id).get_result()
    return response

def insert_doc(db_name="users", doc=None):
    if not doc:
        return {"error": "No document provided"}
    
    response = service.post_document(db=db_name, document=doc).get_result()
    return response

#  "doc": {"_id":"91360b492abfec7472ec3f5b9db489de","_rev": "2-8a19bc5cfbf955267aadbe22e6ffefa4","first_name":"Shambhavi","last_name": "Rani","email": "student.st.rani@gmail.com","aadhaar_number":"123456789012","pan_number": "SSQER2726S","phone": 7482877340,"role": "USER","wallet_address":"0xabc123..."}

def find_user_by_aadhaar(aadhaar):
    selector = {"aadhaar_number": {"$eq": aadhaar}}
    response = service.post_find(db="govt-citizen", selector=selector).get_result()
    docs = response.get("docs", [])
    return docs[0] if docs else None 

def find_user_by_pan(pan):
    selector = {"pan_number": {"$eq": pan}}
    response = service.post_find(db="users", selector=selector).get_result()
    docs = response.get("docs", [])
    return docs[0] if docs else None
    