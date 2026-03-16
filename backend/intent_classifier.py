"""
Intent classification module with Hinglish and shortform abuse detection.
"""
import re
from typing import Dict, Tuple
import logging

logger = logging.getLogger(__name__)


class IntentClassifier:
    """Classify user intent from messages, including Hinglish and shortform abuse."""
    
    def __init__(self):
        """Initialize intent classifier with keyword patterns."""
        # Mapping for leetspeak and symbol obfuscation
        self.symbol_map = {
            '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't',
            '@': 'a', '#': 'h', '$': 's', '&': 'and', '*': '', '_': '',
        }
        
        self.intent_patterns = {
            "question": [
                r"\?$",  # Ends with question mark
                r"^(what|when|where|who|why|how|which|can|could|would|should|is|are|do|does)",
                r"(help|explain|clarify|tell me|show me)",
            ],
            "complaint": [
                r"(don't|dont|never|always|terrible|awful|worst|hate|sick of)",
                r"(problem|issue|bug|error|broken|not working|doesn't work)",
                r"(disappointed|frustrated|angry|annoyed)",
            ],
            "insult": [
                # English insults
                r"(stupid|idiot|dumb|fool|moron|loser|pathetic)",
                r"(shut up|get lost|screw you)",
                r"(nobody cares|no one asked|nobody asked)",
                # Hindi / Hinglish gaali
                r"(chutiya|madarchod|bhosdike|bhenchod|gandu|harami|kutta|saala|kamina)",
                r"(ch[@#*a-z]*tiy[a-z]*)",  # chutiya with symbols
                r"(m[@#*a-z]*d[@#*a-z]*rch[@#*a-z]*d)",  # madarchod
                r"(b[@#*a-z]*hc[@#*a-z]*d)",  # bhenchod
                r"(g[@#*a-z]*ndu)",  # gandu
                r"(mc|bc|bsdk|bkl|lodu)",  # short forms
                r"(mc|bc|mkc|bkl|bsdk|lodu|chomu|tmkc|tmmkc|teri mkc|teri maa)",  # more short forms
                r"(teri maa ki|teri behen ki|maa chod|behen chod)",  # phrases
                r"(chakke|hijra|lavde|lund)",  # more abuse
            ],
            "threat": [
                # English threats
                r"(i'll|ill|gonna|going to).*(kill|hurt|destroy|ruin|attack)",
                r"(watch out|you'll regret|you're dead|you're done)",
                # Hinglish threats
                r"(maar dunga|jaan se maar dunga|dekh lena|teri khair nahi|tujhe jala dunga)",
                r"(khatam kar dunga|tabah kar dunga|bekar kar dunga)",
            ],
            "positive": [
                r"(thank|thanks|appreciate|grateful|awesome|great|excellent|amazing|love)",
                r"(good job|well done|nice|perfect|fantastic|wonderful)",
                r"(😊|😄|😁|👍|❤️|💯)",
            ],
            "disagreement": [
                r"(i disagree|don't agree|wrong|incorrect|that's not)",
                r"(actually|in fact|to be honest|honestly)",
                r"(but|however|although)",
            ],
            "neutral": [],  # Default fallback
        }
    
    def normalize_text(self, text: str) -> str:
        """
        Normalize text by:
        - Converting to lowercase
        - Replacing leetspeak numbers with letters
        - Removing common obfuscation symbols (@, #, $, *, !, etc.)
        """
        text = text.lower()
        # Replace leetspeak numbers with letters
        for num, letter in self.symbol_map.items():
            text = text.replace(num, letter)
        # Remove any remaining non-alphanumeric characters (except spaces)
        text = re.sub(r'[^a-z0-9\s]', '', text)
        return text.strip()
    
    def classify(self, text: str) -> Tuple[str, float]:
        """
        Classify intent of the message.
        
        Args:
            text: Input message
            
        Returns:
            Tuple of (intent, confidence_score)
        """
        # Normalize text to handle obfuscation and leetspeak
        cleaned_text = self.normalize_text(text)
        logger.debug(f"Normalized text: {cleaned_text}")
        
        # Check each intent pattern against the cleaned text
        intent_scores = {}
        
        for intent, patterns in self.intent_patterns.items():
            if intent == "neutral":
                continue
                
            score = 0
            for pattern in patterns:
                if re.search(pattern, cleaned_text):
                    score += 1
            
            if score > 0:
                # Normalize by number of patterns
                intent_scores[intent] = score / len(patterns)
        
        # Get highest scoring intent
        if intent_scores:
            intent = max(intent_scores, key=intent_scores.get)
            confidence = min(intent_scores[intent], 1.0)
            logger.info(f"Classified intent: {intent} with confidence {confidence:.2f}")
            return intent, confidence
        
        # Default to neutral
        logger.info("No intent matched, defaulting to neutral")
        return "neutral", 0.5
    
    def get_intent_explanation(self, intent: str) -> str:
        """Get human-readable explanation for intent."""
        explanations = {
            "question": "User is asking a question or seeking information",
            "complaint": "User is expressing dissatisfaction or reporting an issue",
            "insult": "User is using insulting or disrespectful language",
            "threat": "User is making threatening statements",
            "positive": "User is expressing positive sentiment or gratitude",
            "disagreement": "User is disagreeing or challenging a statement",
            "neutral": "User is making a neutral statement or observation",
        }
        return explanations.get(intent, "Unknown intent")