"""
Database models for chat moderation system – streamlined version.
Includes User, ChatMessage, and MessageReaction only.
"""
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(200), nullable=False)
    bio = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), nullable=False, index=True)
    message = Column(Text, nullable=False)
    file_url = Column(String(500), nullable=True)                # file sharing
    reply_to_id = Column(Integer, ForeignKey("chat_messages.id"), nullable=True)  # reply feature
    is_pinned = Column(Boolean, default=False)                   # pinned messages

    # Toxicity Detection
    toxicity_score = Column(Float, default=0.0)
    is_toxic = Column(Integer, default=0)

    # Intent Classification
    intent = Column(String(50), nullable=True)
    intent_confidence = Column(Float, default=0.0)

    # Tone Analysis
    tone = Column(String(50), nullable=True)
    tone_confidence = Column(Float, default=0.0)

    # Coaching & Rewrite
    coaching_message = Column(Text, nullable=True)
    suggested_rewrite = Column(Text, nullable=True)

    # Metadata
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    room_id = Column(String(100), default="general", index=True)
    edited = Column(Boolean, default=False)
    edited_at = Column(DateTime(timezone=True), nullable=True)

    # Relationship for replies (optional, for ORM convenience)
    replies = relationship("ChatMessage", backref="parent", remote_side=[id])

    def to_dict(self):
        """Convert to dictionary for JSON response"""
        return {
            "id": self.id,
            "username": self.username,
            "message": self.message,
            "file_url": self.file_url,
            "reply_to_id": self.reply_to_id,
            "is_pinned": self.is_pinned,
            "toxicity_score": round(self.toxicity_score, 3),
            "is_toxic": bool(self.is_toxic),
            "intent": self.intent,
            "intent_confidence": round(self.intent_confidence, 3) if self.intent_confidence else 0,
            "tone": self.tone,
            "tone_confidence": round(self.tone_confidence, 3) if self.tone_confidence else 0,
            "coaching_message": self.coaching_message,
            "suggested_rewrite": self.suggested_rewrite,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "room_id": self.room_id,
            "edited": self.edited,
            "edited_at": self.edited_at.isoformat() if self.edited_at else None,
        }


class MessageReaction(Base):
    __tablename__ = "message_reactions"
    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("chat_messages.id"))
    username = Column(String(100), nullable=False)
    reaction = Column(String(10), nullable=False)   # emoji character
    timestamp = Column(DateTime(timezone=True), server_default=func.now())