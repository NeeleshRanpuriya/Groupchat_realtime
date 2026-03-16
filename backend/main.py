"""
Main FastAPI application with authentication, room management, WebSocket, and all advanced features.
Streamlined version – no ModerationStats or UserRoomRead tables.
"""
import os
import logging
import hashlib
import bcrypt
import cloudinary
import cloudinary.uploader
from datetime import datetime, timedelta
from typing import List, Dict, Set, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from pydantic import BaseModel

from database import init_db, get_db
from models import User, ChatMessage, MessageReaction
from toxicity_detector import ToxicityDetector
from intent_classifier import IntentClassifier
from tone_analyzer import ToneAnalyzer
from fastapi import HTTPException
from sqlalchemy import func
import logging
from sqlalchemy import func  # add this at the top with other imports

logger = logging.getLogger(__name__)
# -------------------- Configuration -------------------
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Cloudinary config (optional)
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

# -------------------- Logging -------------------
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# -------------------- FastAPI App -------------------
app = FastAPI(
    title="Real-Time Chat Moderation API",
    description="AI-powered chat moderation with toxicity detection, intent classification, and communication coaching",
    version="2.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------- AI Models -------------------
logger.info("🚀 Initializing AI models...")
toxicity_detector = None
intent_classifier = IntentClassifier()
tone_analyzer = ToneAnalyzer()

try:
    toxicity_detector = ToxicityDetector()
except Exception as e:
    logger.error(f"Failed to load toxicity detector: {e}")
    logger.warning("⚠️ Running without toxicity detection")

# -------------------- Auth Utilities (direct bcrypt) -------------------
def verify_password(plain_password: str, hashed_password: str) -> bool:
    sha256 = hashlib.sha256(plain_password.encode()).hexdigest().encode()
    return bcrypt.checkpw(sha256, hashed_password.encode())

def get_password_hash(password: str) -> str:
    sha256 = hashlib.sha256(password.encode()).hexdigest().encode()
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(sha256, salt)
    return hashed.decode()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    username = decode_token(token)
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# -------------------- Pydantic Schemas -------------------
class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool
    class Config:
        from_attributes = True  # was orm_mode = True (Pydantic V2)

class Token(BaseModel):
    access_token: str
    token_type: str

class JoinRequest(BaseModel):
    username: str

class UserProfileUpdate(BaseModel):
    bio: Optional[str] = None

class UserProfileOut(BaseModel):
    id: int
    username: str
    email: str
    bio: Optional[str]
    is_active: bool
    created_at: datetime
    message_count: int
    toxic_message_count: int
    rooms_joined: int
    class Config:
        from_attributes = True  # was orm_mode = True (Pydantic V2)

class MessageEdit(BaseModel):
    new_text: str

class ReactionCreate(BaseModel):
    reaction: str

class AnnouncementCreate(BaseModel):
    message: str

# -------------------- Auth Endpoints -------------------
@app.post("/auth/register", response_model=UserOut)
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(
        (User.username == user.username) | (User.email == user.email)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already registered")
    hashed = get_password_hash(user.password)
    db_user = User(username=user.username, email=user.email, hashed_password=hashed)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": user.username}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/auth/me", response_model=UserOut)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

# -------------------- Profile Endpoints -------------------
@app.get("/api/user/profile", response_model=UserProfileOut)
def get_user_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    total_messages = db.query(ChatMessage).filter(ChatMessage.username == current_user.username).count()
    toxic_messages = db.query(ChatMessage).filter(
        ChatMessage.username == current_user.username,
        ChatMessage.is_toxic == 1
    ).count()
    rooms_joined = db.query(ChatMessage.room_id).filter(
        ChatMessage.username == current_user.username
    ).distinct().count()
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "bio": current_user.bio,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at,
        "message_count": total_messages,
        "toxic_message_count": toxic_messages,
        "rooms_joined": rooms_joined
    }

@app.put("/api/user/profile")
def update_user_profile(
    update: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if update.bio is not None:
        current_user.bio = update.bio
    db.commit()
    return {"status": "success", "message": "Profile updated"}

@app.delete("/api/user/account")
def delete_user_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.query(ChatMessage).filter(ChatMessage.username == current_user.username).delete()
    db.delete(current_user)
    db.commit()
    return {"status": "success", "message": "Account deleted"}

# -------------------- File Upload Endpoint -------------------
@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    allowed_types = ["image/jpeg", "image/png", "image/gif", "video/mp4", "video/webm", "video/ogg"]
    if file.content_type not in allowed_types:
        raise HTTPException(400, "File type not allowed")
    try:
        result = cloudinary.uploader.upload(file.file, resource_type="auto")
        return {"url": result["secure_url"]}
    except Exception as e:
        raise HTTPException(500, str(e))

# -------------------- Message Endpoints -------------------
@app.put("/api/messages/{message_id}")
def edit_message(message_id: int, edit: MessageEdit, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    message = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    if not message:
        raise HTTPException(404, "Message not found")
    if message.username != current_user.username:
        raise HTTPException(403, "You can only edit your own messages")
    message.message = edit.new_text
    message.edited = True
    message.edited_at = datetime.utcnow()
    db.commit()
    return {"status": "updated"}

@app.delete("/api/messages/{message_id}")
def delete_message(message_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    message = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    if not message:
        raise HTTPException(404, "Message not found")
    # Allow if own message OR user is admin of that room
    if message.username != current_user.username:
        # Check if current_user is admin of the room
        if message.room_id not in manager.room_admins or manager.room_admins[message.room_id] != current_user.username:
            raise HTTPException(403, "Not authorized to delete this message")
    db.delete(message)
    db.commit()
    return {"status": "deleted"}

@app.post("/api/messages/{message_id}/react")
def add_reaction(message_id: int, reaction: ReactionCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(MessageReaction).filter(
        MessageReaction.message_id == message_id,
        MessageReaction.username == current_user.username,
        MessageReaction.reaction == reaction.reaction
    ).first()
    if existing:
        db.delete(existing)
        db.commit()
        return {"status": "removed"}
    else:
        new_reaction = MessageReaction(
            message_id=message_id,
            username=current_user.username,
            reaction=reaction.reaction
        )
        db.add(new_reaction)
        db.commit()
        return {"status": "added"}

@app.get("/api/messages/{message_id}/reactions")
def get_reactions(message_id: int, db: Session = Depends(get_db)):
    reactions = db.query(MessageReaction).filter(MessageReaction.message_id == message_id).all()
    result = {}
    for r in reactions:
        result.setdefault(r.reaction, []).append(r.username)
    return result

@app.post("/api/rooms/{room_id}/pin/{message_id}")
def pin_message(room_id: str, message_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Only admin can pin
    if room_id not in manager.room_admins or manager.room_admins[room_id] != current_user.username:
        raise HTTPException(403, "Only admin can pin messages")
    message = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    if not message or message.room_id != room_id:
        raise HTTPException(404, "Message not found")
    message.is_pinned = not message.is_pinned  # toggle
    db.commit()
    return {"is_pinned": message.is_pinned}

@app.get("/api/rooms/{room_id}/pinned")
def get_pinned_messages(room_id: str, db: Session = Depends(get_db)):
    messages = db.query(ChatMessage).filter(
        ChatMessage.room_id == room_id,
        ChatMessage.is_pinned == True
    ).order_by(ChatMessage.timestamp.desc()).all()
    return [msg.to_dict() for msg in messages]

@app.post("/api/rooms/{room_id}/announcement")
def make_announcement(room_id: str, ann: AnnouncementCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if room_id not in manager.room_admins or manager.room_admins[room_id] != current_user.username:
        raise HTTPException(403, "Only admin can make announcements")
    system_msg = ChatMessage(
        username="System",
        message=ann.message,
        room_id=room_id,
        is_toxic=0,
        toxicity_score=0.0
    )
    db.add(system_msg)
    db.commit()
    return {"status": "announcement sent"}

@app.get("/api/rooms/{room_id}/search")
def search_messages(room_id: str, q: str, db: Session = Depends(get_db)):
    messages = db.query(ChatMessage).filter(
        ChatMessage.room_id == room_id,
        ChatMessage.message.contains(q)
    ).order_by(ChatMessage.timestamp.desc()).limit(50).all()
    return [msg.to_dict() for msg in messages]

# -------------------- Room Management Endpoints -------------------
@app.post("/api/rooms/{room_id}/request-join")
async def request_join(room_id: str, request: JoinRequest, db: Session = Depends(get_db)):
    username = request.username
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if manager.request_join(room_id, username):
        return {"status": "request_sent"}
    return {"status": "already_member_or_pending"}

@app.post("/api/rooms/{room_id}/approve-request")
async def approve_request(room_id: str, admin: str, username: str):
    logger.info(f"📥 approve-request: room={room_id}, admin={admin}, username={username}")
    if room_id not in manager.room_admins:
        raise HTTPException(status_code=404, detail="Room not found")
    stored_admin = manager.room_admins[room_id]
    if stored_admin.lower() != admin.lower():
        raise HTTPException(status_code=403, detail="Only admin can approve")
    if manager.approve_request(room_id, stored_admin, username):
        return {"status": "approved"}
    raise HTTPException(status_code=400, detail="Approval failed")

@app.post("/api/rooms/{room_id}/reject-request")
async def reject_request(room_id: str, admin: str, username: str):
    logger.info(f"📥 reject-request: room={room_id}, admin={admin}, username={username}")
    if room_id not in manager.room_admins:
        raise HTTPException(status_code=404, detail="Room not found")
    stored_admin = manager.room_admins[room_id]
    if stored_admin.lower() != admin.lower():
        raise HTTPException(status_code=403, detail="Only admin can reject")
    if manager.reject_request(room_id, stored_admin, username):
        return {"status": "rejected"}
    raise HTTPException(status_code=400, detail="Rejection failed")

@app.get("/api/rooms/{room_id}/pending-requests")
async def get_pending_requests(room_id: str, admin: str):
    logger.info(f"📥 pending-requests: room={room_id}, admin={admin}")
    if room_id not in manager.room_admins:
        raise HTTPException(status_code=404, detail="Room not found")
    stored_admin = manager.room_admins[room_id]
    if stored_admin.lower() != admin.lower():
        raise HTTPException(status_code=403, detail="Only admin can view requests")
    return {"pending": manager.pending_requests.get(room_id, [])}

@app.get("/api/rooms/{room_id}/members")
async def get_members(room_id: str):
    return {"members": list(manager.room_members.get(room_id, []))}

@app.get("/api/rooms/{room_id}/admin")
async def get_room_admin(room_id: str):
    if room_id not in manager.room_admins:
        raise HTTPException(status_code=404, detail="Room not found")
    return {"admin": manager.room_admins[room_id]}

# -------------------- ConnectionManager with Room Support -------------------
class ConnectionManager:
    def __init__(self):
        self.rooms: Dict[str, List[WebSocket]] = {}
        self.room_members: Dict[str, Set[str]] = {}
        self.room_admins: Dict[str, str] = {}
        self.pending_requests: Dict[str, List[str]] = {}
        self.user_room: Dict[str, str] = {}

    async def connect(self, websocket: WebSocket, room_id: str, username: str):
        await websocket.accept()
        if room_id not in self.rooms:
            self.rooms[room_id] = []
            self.room_members[room_id] = set()
            self.pending_requests[room_id] = []
            self.room_admins[room_id] = username
            self.room_members[room_id].add(username)
            logger.info(f"✅ Room {room_id} created. Admin: {username}")
        else:
            if username not in self.room_members[room_id]:
                await websocket.close(code=1008, reason="Not a member of this room")
                return
        self.rooms[room_id].append(websocket)
        self.user_room[username] = room_id
        logger.info(f"✅ User {username} joined room {room_id}. Room members: {len(self.rooms[room_id])}")

    def disconnect(self, websocket: WebSocket, room_id: str, username: str):
        if room_id in self.rooms:
            self.rooms[room_id].remove(websocket)
            if not self.rooms[room_id]:
                del self.rooms[room_id]
        if username in self.user_room:
            del self.user_room[username]
        logger.info(f"❌ User {username} left room {room_id}")

    async def broadcast(self, room_id: str, message: dict, exclude: WebSocket = None):
        if room_id in self.rooms:
            for connection in self.rooms[room_id]:
                if connection != exclude:
                    try:
                        await connection.send_json(message)
                    except Exception as e:
                        logger.error(f"Error broadcasting to client: {e}")

    def request_join(self, room_id: str, username: str) -> bool:
        logger.info(f"📥 request_join called: room={room_id}, username={username}")
        if room_id not in self.room_members:
            logger.warning(f"❌ Room {room_id} does not exist")
            return False
        if username in self.room_members[room_id]:
            logger.info(f"✅ User {username} already a member")
            return False
        if username not in self.pending_requests[room_id]:
            self.pending_requests[room_id].append(username)
            logger.info(f"✅ Added {username} to pending requests for room {room_id}")
            return True
        logger.info(f"ℹ️ User {username} already in pending requests")
        return False

    def approve_request(self, room_id: str, admin: str, username: str) -> bool:
        logger.info(f"📥 approve_request: room={room_id}, admin={admin}, username={username}")
        if room_id not in self.room_admins:
            logger.warning(f"❌ Room {room_id} has no admin")
            return False
        stored_admin = self.room_admins[room_id]
        if stored_admin.lower() != admin.lower():
            logger.warning(f"❌ Admin mismatch: stored='{stored_admin}', received='{admin}'")
            return False
        if username in self.pending_requests[room_id]:
            self.pending_requests[room_id].remove(username)
            self.room_members[room_id].add(username)
            logger.info(f"✅ Approved {username}")
            return True
        logger.warning(f"❌ {username} not in pending requests")
        return False

    def reject_request(self, room_id: str, admin: str, username: str) -> bool:
        logger.info(f"📥 reject_request: room={room_id}, admin={admin}, username={username}")
        if room_id not in self.room_admins:
            logger.warning(f"❌ Room {room_id} has no admin")
            return False
        stored_admin = self.room_admins[room_id]
        if stored_admin.lower() != admin.lower():
            logger.warning(f"❌ Admin mismatch: stored='{stored_admin}', received='{admin}'")
            return False
        if username in self.pending_requests[room_id]:
            self.pending_requests[room_id].remove(username)
            logger.info(f"✅ Rejected {username}")
            return True
        logger.warning(f"❌ {username} not in pending requests")
        return False

    def kick_user(self, room_id: str, admin: str, username: str) -> bool:
        if room_id not in self.room_admins or self.room_admins[room_id] != admin:
            return False
        if username in self.room_members[room_id]:
            self.room_members[room_id].remove(username)
            return True
        return False

    def leave_room(self, room_id: str, username: str) -> bool:
        if room_id in self.room_members and username in self.room_members[room_id]:
            self.room_members[room_id].remove(username)
            if room_id in self.room_admins and self.room_admins[room_id] == username:
                other_members = [m for m in self.room_members[room_id] if m != username]
                if other_members:
                    self.room_admins[room_id] = other_members[0]
                else:
                    del self.room_admins[room_id]
            return True
        return False

manager = ConnectionManager()

# -------------------- Helper Functions -------------------
async def process_message(message: str, username: str, room_id: str, db: Session, file_url: Optional[str] = None, reply_to_id: Optional[int] = None) -> dict:
    logger.info(f"Processing message from {username} in room {room_id}: {message[:50]}...")
    toxicity_result = {"toxicity_score": 0.0, "is_toxic": False, "categories": {}}
    if toxicity_detector:
        try:
            toxicity_result = toxicity_detector.predict(message)
        except Exception as e:
            logger.error(f"Toxicity detection failed: {e}")
    intent, intent_confidence = intent_classifier.classify(message)
    tone_result = tone_analyzer.analyze_tone(message, toxicity_result["toxicity_score"], intent)
    coaching_message = None
    suggested_rewrite = None
    if toxicity_result["toxicity_score"] > 0.3 or tone_result["tone"] in ["rude", "aggressive"]:
        coaching_message = tone_analyzer.generate_coaching(message, tone_result["tone"], toxicity_result["toxicity_score"], intent)
        suggested_rewrite = tone_analyzer.suggest_rewrite(message, tone_result["tone"], toxicity_result["toxicity_score"])
    chat_message = ChatMessage(
        username=username,
        message=message,
        file_url=file_url,
        reply_to_id=reply_to_id,
        toxicity_score=toxicity_result["toxicity_score"],
        is_toxic=int(toxicity_result["is_toxic"]),
        intent=intent,
        intent_confidence=intent_confidence,
        tone=tone_result["tone"],
        tone_confidence=tone_result["confidence"],
        coaching_message=coaching_message,
        suggested_rewrite=suggested_rewrite,
        room_id=room_id
    )
    db.add(chat_message)
    db.commit()
    db.refresh(chat_message)
    # Optionally fetch reply_to info for response
    reply_to_info = None
    if reply_to_id:
        original = db.query(ChatMessage).filter(ChatMessage.id == reply_to_id).first()
        if original:
            reply_to_info = {
                "id": original.id,
                "username": original.username,
                "message": original.message[:100]
            }
    response = {
        "id": chat_message.id,
        "username": username,
        "message": message,
        "file_url": file_url,
        "reply_to": reply_to_info,
        "analysis": {
            "toxicity": {
                "score": round(toxicity_result["toxicity_score"], 3),
                "is_toxic": toxicity_result["is_toxic"],
                "top_categories": toxicity_detector.get_top_categories(toxicity_result.get("categories", {})) if toxicity_detector else []
            },
            "intent": {
                "type": intent,
                "confidence": round(intent_confidence, 3),
                "explanation": intent_classifier.get_intent_explanation(intent)
            },
            "tone": {
                "type": tone_result["tone"],
                "confidence": round(tone_result["confidence"], 3),
                "explanation": tone_result.get("explanation", "")
            }
        },
        "coaching": {
            "message": coaching_message,
            "suggested_rewrite": suggested_rewrite
        },
        "timestamp": chat_message.timestamp.isoformat()
    }
    return response

# -------------------- Startup Event -------------------
@app.on_event("startup")
async def startup_event():
    logger.info("🔧 Initializing database...")
    init_db()
    logger.info("✅ Application startup complete!")

# -------------------- REST Endpoints (Existing) -------------------
@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "Real-Time Chat Moderation API",
        "version": "2.0.0",
        "endpoints": {
            "websocket": "/ws/{room_id}/{username}",
            "messages": "/api/messages",
            "stats": "/api/stats"
        }
    }

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "models": {
            "toxicity_detector": toxicity_detector is not None,
            "intent_classifier": True,
            "tone_analyzer": tone_analyzer.client is not None
        },
        "connections": sum(len(v) for v in manager.rooms.values()),
        "rooms": list(manager.rooms.keys()),
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/analyze")
async def analyze_message(
    message: str,
    username: str = "anonymous",
    room_id: str = "general",
    db: Session = Depends(get_db)
):
    result = await process_message(message, username, room_id, db)
    return result

@app.get("/api/messages")
async def get_messages(
    limit: int = 50,
    room_id: str = "general",
    db: Session = Depends(get_db)
):
    messages = db.query(ChatMessage).filter(ChatMessage.room_id == room_id).order_by(ChatMessage.timestamp.desc()).limit(limit).all()
    return {
        "messages": [msg.to_dict() for msg in reversed(messages)],
        "count": len(messages)
    }



@app.get("/api/stats")
async def get_stats(db: Session = Depends(get_db)):
    try:
        total = db.query(ChatMessage).count()
        toxic = db.query(ChatMessage).filter(ChatMessage.is_toxic == 1).count()
        clean = total - toxic

        # Intent breakdown (handle None values)
        intents_raw = db.query(ChatMessage.intent, func.count(ChatMessage.id)).group_by(ChatMessage.intent).all()
        intents = {intent or "unknown": count for intent, count in intents_raw if intent is not None}

        # Tone breakdown
        tones_raw = db.query(ChatMessage.tone, func.count(ChatMessage.id)).group_by(ChatMessage.tone).all()
        tones = {tone or "unknown": count for tone, count in tones_raw if tone is not None}

        # Active connections – ensure manager is defined
        active_connections = 0
        if hasattr(manager, 'rooms'):
            active_connections = sum(len(v) for v in manager.rooms.values())

        return {
            "total_messages": total,
            "toxic_messages": toxic,
            "clean_messages": clean,
            "toxicity_rate": round(toxic / total * 100, 2) if total > 0 else 0,
            "intents": intents,
            "tones": tones,
            "active_connections": active_connections
        }
    except Exception as e:
        logger.error(f"Stats endpoint error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

# -------------------- WebSocket Endpoint with All Features -------------------
@app.websocket("/ws/{room_id}/{username}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        await websocket.close(code=1008, reason="User not found")
        return
    await manager.connect(websocket, room_id, username)
    if websocket.client_state.name == 'DISCONNECTED':
        return

    await manager.broadcast(room_id, {
        "type": "system",
        "message": f"{username} joined the room",
        "timestamp": datetime.now().isoformat()
    })

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "message")

            if msg_type == "typing":
                await manager.broadcast(room_id, {
                    "type": "typing",
                    "username": username,
                    "is_typing": data.get("is_typing", True)
                })

            elif msg_type == "reaction":
                await manager.broadcast(room_id, {
                    "type": "reaction",
                    "username": username,
                    "message_id": data.get("message_id"),
                    "reaction": data.get("reaction")
                })

            elif msg_type == "kick":
                if manager.room_admins.get(room_id) == username:
                    target = data.get("target")
                    if target and manager.kick_user(room_id, username, target):
                        await manager.broadcast(room_id, {"type": "kicked", "username": target})
                else:
                    await websocket.send_json({"type": "error", "message": "Only admin can kick"})

            elif msg_type == "leave":
                manager.leave_room(room_id, username)
                await manager.broadcast(room_id, {"type": "system", "message": f"{username} left the room"})
                await websocket.close(code=1000, reason="User left")
                break

            # WebRTC Signaling
            elif msg_type == "call-offer":
                target = data.get("target")
                if target:
                    await manager.broadcast(room_id, {
                        "type": "call-offer",
                        "from": username,
                        "to": target,
                        "offer": data.get("offer")
                    })
            elif msg_type == "call-answer":
                target = data.get("target")
                if target:
                    await manager.broadcast(room_id, {
                        "type": "call-answer",
                        "from": username,
                        "to": target,
                        "answer": data.get("answer")
                    })
            elif msg_type == "ice-candidate":
                target = data.get("target")
                if target:
                    await manager.broadcast(room_id, {
                        "type": "ice-candidate",
                        "from": username,
                        "to": target,
                        "candidate": data.get("candidate")
                    })

            else:  # regular message with optional file_url and reply_to_id
                message_text = data.get("message", "").strip()
                file_url = data.get("file_url")
                reply_to_id = data.get("reply_to_id")
                if not message_text and not file_url:
                    continue
                result = await process_message(message_text, username, room_id, db, file_url=file_url, reply_to_id=reply_to_id)
                await websocket.send_json({"type": "analysis", **result})
                await manager.broadcast(room_id, {
                    "type": "message",
                    "id": result["id"],
                    "username": username,
                    "message": message_text,
                    "file_url": file_url,
                    "reply_to": result.get("reply_to"),
                    "is_toxic": result["analysis"]["toxicity"]["is_toxic"],
                    "toxicity_score": result["analysis"]["toxicity"]["score"],
                    "timestamp": result["timestamp"]
                })

    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id, username)
        await manager.broadcast(room_id, {
            "type": "system",
            "message": f"{username} left the room",
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"WebSocket error for {username} in room {room_id}: {e}")
        manager.disconnect(websocket, room_id, username)

# -------------------- Main -------------------
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True, log_level="info")