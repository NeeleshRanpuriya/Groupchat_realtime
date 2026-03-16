# API Documentation

**Real-Time Chat Moderation System**

------------------------------------------------------------------------

## Base URL

  Environment   URL
  ------------- -------------------------
  Development   http://localhost:8000
  Production    https://your-domain.com

------------------------------------------------------------------------

## REST API

### 1. Health Check

**GET /**

Response

``` json
{
  "status": "online",
  "service": "Real-Time Chat Moderation API",
  "version": "1.0.0",
  "endpoints": {
    "websocket": "/ws/{username}",
    "messages": "/api/messages",
    "stats": "/api/stats"
  }
}
```

------------------------------------------------------------------------

### 2. System Health

**GET /api/health**

Response

``` json
{
  "status": "healthy",
  "models": {
    "toxicity_detector": true,
    "intent_classifier": true,
    "tone_analyzer": true
  },
  "connections": 3,
  "timestamp": "2024-01-28T10:30:00Z"
}
```

------------------------------------------------------------------------

### 3. Analyze Message

**POST /api/analyze**

Request

``` json
{
  "message": "You're an idiot",
  "username": "john_doe"
}
```

Response

``` json
{
  "id": 123,
  "username": "john_doe",
  "message": "You're an idiot",
  "analysis": {
    "toxicity": {
      "score": 0.856,
      "is_toxic": true,
      "categories": {
        "toxic": 0.856,
        "insult": 0.923,
        "threat": 0.112,
        "obscene": 0.045
      },
      "top_categories": ["insult", "toxic"]
    },
    "intent": {
      "type": "insult",
      "confidence": 0.98,
      "explanation": "User is using insulting language"
    },
    "tone": {
      "type": "rude",
      "confidence": 0.92,
      "explanation": "Message contains disrespectful words"
    }
  },
  "coaching": {
    "message": "Your message sounds disrespectful. Try using neutral words.",
    "suggested_rewrite": "I respectfully disagree with your approach."
  },
  "timestamp": "2024-01-28T10:30:00Z"
}
```

------------------------------------------------------------------------

### 4. Message History

**GET /api/messages**

Query Params: - limit (default 50) - room_id (default general)

------------------------------------------------------------------------

### 5. Statistics

**GET /api/stats**

Response

``` json
{
  "total_messages": 150,
  "toxic_messages": 23,
  "clean_messages": 127,
  "toxicity_rate": 15.33,
  "active_connections": 5
}
```

------------------------------------------------------------------------

### 6. Delete Message

**DELETE /api/messages/{id}**

Response

``` json
{
  "message": "Message deleted successfully",
  "id": 123
}
```

------------------------------------------------------------------------

## WebSocket API

### Connect

    ws://localhost:8000/ws/{username}

Client -\> Server

``` json
{ "message": "Hello everyone!" }
```

Server -\> Client (Analysis)

``` json
{ "type": "analysis", "analysis": {...}, "coaching": {...} }
```

------------------------------------------------------------------------

## Error Codes

  Code   Meaning
  ------ --------------
  200    OK
  404    Not Found
  422    Invalid Data
  500    Server Error

------------------------------------------------------------------------

## Data Model

  Field               Description
  ------------------- -----------------
  id                  Primary Key
  username            Sender
  message             Chat text
  toxicity_score      0--1
  is_toxic            true/false
  intent              Detected intent
  tone                Detected tone
  coaching_message    AI feedback
  suggested_rewrite   Polite text
  timestamp           Created time

------------------------------------------------------------------------

## Security

-   Add JWT Authentication
-   Enable HTTPS
-   Rate limiting
-   Input sanitization
