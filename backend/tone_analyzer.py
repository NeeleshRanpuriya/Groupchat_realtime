"""
Tone analysis and coaching using OpenAI
"""
import os
from openai import OpenAI
from typing import Dict, Optional
import logging
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


class ToneAnalyzer:
    """Analyze tone and provide communication coaching"""
    
    def __init__(self):
        """Initialize OpenAI client"""
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key or api_key == "your_openai_api_key_here":
            logger.warning("⚠️ OpenAI API key not configured. Tone analysis will use fallback.")
            self.client = None
        else:
            self.client = OpenAI(api_key=api_key)
            logger.info("✅ OpenAI client initialized")
    
    def analyze_tone(self, text: str, toxicity_score: float = 0.0, intent: str = "neutral") -> Dict:
        """
        Analyze tone using OpenAI or fallback to rule-based
        
        Args:
            text: Input message
            toxicity_score: Toxicity score from detector
            intent: Classified intent
            
        Returns:
            Dictionary with tone, confidence, and analysis
        """
        # Fallback for no OpenAI key
        if not self.client:
            return self._fallback_tone_analysis(text, toxicity_score, intent)
        
        try:
            prompt = f"""Analyze the tone of this message and classify it as one of: polite, neutral, rude, aggressive, passive-aggressive, or sarcastic.

Message: "{text}"

Additional context:
- Toxicity score: {toxicity_score:.2f}
- Intent: {intent}

Respond in this exact format:
Tone: [tone]
Confidence: [0.0-1.0]
Explanation: [brief explanation]"""

            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a communication expert analyzing message tone."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=150
            )
            
            result = response.choices[0].message.content.strip()
            
            # Parse response
            tone = "neutral"
            confidence = 0.5
            explanation = ""
            
            for line in result.split("\n"):
                if line.startswith("Tone:"):
                    tone = line.split(":", 1)[1].strip().lower()
                elif line.startswith("Confidence:"):
                    try:
                        confidence = float(line.split(":", 1)[1].strip())
                    except:
                        confidence = 0.7
                elif line.startswith("Explanation:"):
                    explanation = line.split(":", 1)[1].strip()
            
            return {
                "tone": tone,
                "confidence": confidence,
                "explanation": explanation
            }
            
        except Exception as e:
            logger.error(f"Error in OpenAI tone analysis: {e}")
            return self._fallback_tone_analysis(text, toxicity_score, intent)
    
    def _fallback_tone_analysis(self, text: str, toxicity_score: float, intent: str) -> Dict:
        """Rule-based fallback tone analysis"""
        text_lower = text.lower()
        
        # Determine tone based on toxicity and intent
        if toxicity_score > 0.7 or intent == "threat":
            tone = "aggressive"
            confidence = 0.8
        elif toxicity_score > 0.5 or intent == "insult":
            tone = "rude"
            confidence = 0.7
        elif intent == "positive":
            tone = "polite"
            confidence = 0.8
        elif intent == "complaint":
            tone = "frustrated"
            confidence = 0.6
        else:
            tone = "neutral"
            confidence = 0.5
        
        return {
            "tone": tone,
            "confidence": confidence,
            "explanation": f"Tone classified based on toxicity score ({toxicity_score:.2f}) and intent ({intent})"
        }
    
    def generate_coaching(self, text: str, tone: str, toxicity_score: float, intent: str) -> str:
        """Generate communication coaching message"""
        
        if not self.client:
            return self._fallback_coaching(tone, toxicity_score, intent)
        
        try:
            prompt = f"""You are a professional communication coach. A user sent this message:

"{text}"

Analysis:
- Tone: {tone}
- Toxicity: {toxicity_score:.2f}
- Intent: {intent}

Provide brief, constructive coaching (2-3 sentences) on how to communicate more effectively. Be encouraging and specific."""

            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a supportive communication coach providing constructive feedback."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=150
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"Error generating coaching: {e}")
            return self._fallback_coaching(tone, toxicity_score, intent)
    
    def _fallback_coaching(self, tone: str, toxicity_score: float, intent: str) -> str:
        """Fallback coaching messages"""
        if toxicity_score > 0.7:
            return "Consider rephrasing this message in a more respectful way. Aggressive language can damage relationships and hinder productive conversation."
        elif toxicity_score > 0.5:
            return "This message comes across as harsh. Try expressing your thoughts with more neutral language to maintain positive communication."
        elif tone in ["rude", "aggressive"]:
            return "Your message could be perceived as disrespectful. Consider using a more polite tone to ensure your message is well-received."
        elif intent == "complaint":
            return "When expressing concerns, try to focus on specific issues and suggest constructive solutions rather than just criticizing."
        else:
            return "Your message is clear. Consider adding context or asking questions to encourage dialogue."
    
    def suggest_rewrite(self, text: str, tone: str, toxicity_score: float) -> Optional[str]:
        """Generate a polite rewrite suggestion"""
        
        if toxicity_score < 0.3:
            return None  # Message is already polite
        
        if not self.client:
            return self._fallback_rewrite(text)
        
        try:
            prompt = f"""Rewrite this message to be more polite, professional, and constructive while maintaining the core meaning:

Original: "{text}"

Provide ONLY the rewritten message, nothing else."""

            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an expert at rephrasing messages to be more polite and professional."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=200
            )
            
            return response.choices[0].message.content.strip().strip('"')
            
        except Exception as e:
            logger.error(f"Error generating rewrite: {e}")
            return self._fallback_rewrite(text)
    
    def _fallback_rewrite(self, text: str) -> str:
        """Simple fallback rewrite"""
        # Basic cleanup
        text = text.replace("stupid", "incorrect")
        text = text.replace("idiot", "person")
        text = text.replace("shut up", "please be quiet")
        text = text.replace("hate", "dislike")
        
        return f"I would like to respectfully share that {text.lower()}"
