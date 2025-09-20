from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

from project.utils.cloudant_client import (
    create_or_get_chat, 
    send_message, 
    get_chat_messages, 
    get_user_chats, 
    get_chat_by_id, 
    mark_messages_as_read,
    get_property_by_id,
    find_user_by_email
)

@csrf_exempt
def initiate_chat(request):
    """
    Initiate a chat between buyer and seller for a property.
    POST body: {
        "property_id": "string",
        "buyer_email": "string",
        "seller_email": "string" (optional - will be fetched from property)
    }
    Enforces: buyer must be a known user (acts as minimal auth gate).
    """
    if request.method == "POST":
        try:
            body = json.loads(request.body.decode('utf-8')) if request.body else {}
        except Exception:
            return JsonResponse({"success": False, "message": "Invalid JSON"}, status=400)
        
        property_id = body.get("property_id")
        buyer_email = body.get("buyer_email")
        seller_email = body.get("seller_email")
        
        if not property_id or not buyer_email:
            return JsonResponse({
                "success": False, 
                "message": "property_id and buyer_email are required"
            }, status=400)
        
        try:
            # Minimal auth: buyer must exist in known user databases
            buyer_doc = find_user_by_email(buyer_email)
            if not buyer_doc:
                return JsonResponse({"success": False, "message": "Authentication required"}, status=403)

            # If seller email not provided, derive from property owner wallet
            if not seller_email:
                property_data = get_property_by_id(property_id)
                if not property_data:
                    return JsonResponse({
                        "success": False, 
                        "message": "Property not found"
                    }, status=404)
                
                # Get the property wallet and find the user's email
                wallet_address = property_data.get("wallet") or property_data.get("wallet_address")
                if not wallet_address:
                    return JsonResponse({
                        "success": False, 
                        "message": "Property owner information not found"
                    }, status=404)
                
                # Lookup seller by wallet in app-users
                try:
                    from project.utils.cloudant_client import find_user_by_wallet
                    seller_doc = find_user_by_wallet(wallet_address)
                except Exception as e:
                    print(f"Error resolving seller by wallet: {e}")
                    seller_doc = None
                
                if not seller_doc:
                    return JsonResponse({"success": False, "message": "Seller not found for this property"}, status=404)

                seller_email = seller_doc.get("Email") or seller_doc.get("email")
                if not seller_email:
                    return JsonResponse({"success": False, "message": "Seller email not available"}, status=404)

            # Prevent self-chat
            if seller_email == buyer_email:
                return JsonResponse({"success": False, "message": "Cannot initiate chat with yourself"}, status=400)
            
            # Create or get existing chat
            chat_result = create_or_get_chat(property_id, buyer_email, seller_email)
            
            if "error" in chat_result:
                return JsonResponse({
                    "success": False, 
                    "message": f"Failed to create chat: {chat_result['error']}"
                }, status=500)
            
            return JsonResponse({
                "success": True,
                "chat": {
                    "chat_id": chat_result.get("_id"),
                    "property_id": chat_result.get("property_id"),
                    "participants": chat_result.get("participants"),
                    "created_at": chat_result.get("created_at")
                }
            })
            
        except Exception as e:
            print(f"Error initiating chat: {e}")
            return JsonResponse({"success": False, "message": "Error initiating chat"}, status=500)

@csrf_exempt
def send_chat_message(request):
    """
    Send a message in a chat.
    POST body: {
        "chat_id": "string",
        "sender_email": "string", 
        "message": "string"
    }
    """
    if request.method == "POST":
        try:
            body = json.loads(request.body.decode('utf-8')) if request.body else {}
        except Exception:
            return JsonResponse({"success": False, "message": "Invalid JSON"}, status=400)
        
        chat_id = body.get("chat_id")
        sender_email = body.get("sender_email")
        message_text = body.get("message")
        
        if not all([chat_id, sender_email, message_text]):
            return JsonResponse({
                "success": False, 
                "message": "chat_id, sender_email, and message are required"
            }, status=400)
        
        try:
            # Verify chat exists and sender is a participant
            chat = get_chat_by_id(chat_id)
            if not chat:
                return JsonResponse({
                    "success": False, 
                    "message": "Chat not found"
                }, status=404)
            
            participants = chat.get("participants", [])
            if sender_email not in participants:
                return JsonResponse({
                    "success": False, 
                    "message": "You are not a participant in this chat"
                }, status=403)
            
            # Send the message
            message_result = send_message(chat_id, sender_email, message_text)
            
            if "error" in message_result:
                return JsonResponse({
                    "success": False, 
                    "message": f"Failed to send message: {message_result['error']}"
                }, status=500)
            
            return JsonResponse({
                "success": True,
                "message": {
                    "message_id": message_result.get("_id"),
                    "chat_id": message_result.get("chat_id"),
                    "sender_email": message_result.get("sender_email"),
                    "message_text": message_result.get("message_text"),
                    "timestamp": message_result.get("timestamp")
                }
            })
            
        except Exception as e:
            print(f"Error sending message: {e}")
            return JsonResponse({"success": False, "message": "Error sending message"}, status=500)

@csrf_exempt
def get_chat_history(request, chat_id):
    """
    Get all messages for a specific chat.
    GET /api/property/chats/<chat_id>/messages/
    Query params: ?user_email=<email> (for marking messages as read)
    """
    if request.method == "GET":
        try:
            # Verify chat exists
            chat = get_chat_by_id(chat_id)
            if not chat:
                return JsonResponse({
                    "success": False, 
                    "message": "Chat not found"
                }, status=404)
            
            user_email = request.GET.get("user_email")
            if user_email:
                # Verify user is a participant
                participants = chat.get("participants", [])
                if user_email not in participants:
                    return JsonResponse({
                        "success": False, 
                        "message": "You are not a participant in this chat"
                    }, status=403)
                
                # Mark messages as read for this user
                mark_messages_as_read(chat_id, user_email)
            
            # Get messages
            messages = get_chat_messages(chat_id)
            
            # Format messages for frontend
            formatted_messages = []
            for msg in messages:
                formatted_messages.append({
                    "message_id": msg.get("_id"),
                    "sender_email": msg.get("sender_email"),
                    "message_text": msg.get("message_text"),
                    "timestamp": msg.get("timestamp"),
                    "read": msg.get("read", False)
                })
            
            return JsonResponse({
                "success": True,
                "chat": {
                    "chat_id": chat.get("_id"),
                    "property_id": chat.get("property_id"),
                    "participants": chat.get("participants"),
                    "created_at": chat.get("created_at")
                },
                "messages": formatted_messages,
                "count": len(formatted_messages)
            })
            
        except Exception as e:
            print(f"Error getting chat history: {e}")
            return JsonResponse({"success": False, "message": "Error getting chat history"}, status=500)

@csrf_exempt
def get_user_chat_list(request):
    """
    Get all chats for a user.
    POST body: {"user_email": "string"}
    """
    if request.method == "POST":
        try:
            body = json.loads(request.body.decode('utf-8')) if request.body else {}
        except Exception:
            return JsonResponse({"success": False, "message": "Invalid JSON"}, status=400)
        
        user_email = body.get("user_email")
        
        if not user_email:
            return JsonResponse({
                "success": False, 
                "message": "user_email is required"
            }, status=400)
        
        try:
            chats = get_user_chats(user_email)
            
            # Format chats for frontend and add property details
            formatted_chats = []
            for chat in chats:
                property_id = chat.get("property_id")
                property_data = None
                
                if property_id:
                    property_data = get_property_by_id(property_id)
                
                # Determine the other participant (buyer or seller)
                participants = chat.get("participants", [])
                other_participant = None
                for participant in participants:
                    if participant != user_email:
                        other_participant = participant
                        break
                
                formatted_chats.append({
                    "chat_id": chat.get("_id"),
                    "property_id": property_id,
                    "property_title": property_data.get("title") if property_data else f"Property {property_id}",
                    "property_location": property_data.get("location") if property_data else "Location not available",
                    "other_participant": other_participant,
                    "last_message_at": chat.get("last_message_at"),
                    "created_at": chat.get("created_at"),
                    "status": chat.get("status")
                })
            
            return JsonResponse({
                "success": True,
                "chats": formatted_chats,
                "count": len(formatted_chats)
            })
            
        except Exception as e:
            print(f"Error getting user chats: {e}")
            return JsonResponse({"success": False, "message": "Error getting user chats"}, status=500)

@csrf_exempt
def get_chat_info(request, chat_id):
    """
    Get basic information about a chat (for property info display).
    GET /api/property/chats/<chat_id>/info/
    """
    if request.method == "GET":
        try:
            chat = get_chat_by_id(chat_id)
            if not chat:
                return JsonResponse({
                    "success": False, 
                    "message": "Chat not found"
                }, status=404)
            
            property_id = chat.get("property_id")
            property_data = None
            
            if property_id:
                property_data = get_property_by_id(property_id)
            
            return JsonResponse({
                "success": True,
                "chat": {
                    "chat_id": chat.get("_id"),
                    "property_id": property_id,
                    "participants": chat.get("participants"),
                    "created_at": chat.get("created_at"),
                    "status": chat.get("status")
                },
                "property": {
                    "property_id": property_id,
                    "title": property_data.get("title") if property_data else f"Property {property_id}",
                    "location": property_data.get("location") if property_data else "Location not available",
                    "type": property_data.get("type") or property_data.get("Category") if property_data else "Type not available"
                } if property_data else None
            })
            
        except Exception as e:
            print(f"Error getting chat info: {e}")
            return JsonResponse({"success": False, "message": "Error getting chat info"}, status=500)