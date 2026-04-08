"""
Toxicity detection using HuggingFace transformers with rule‑based fallback for Hinglish abuse.
"""

import re
try:
    import torch
except Exception:
    torch = None

try:
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
except Exception:
    AutoTokenizer = None
    AutoModelForSequenceClassification = None
from typing import Dict, List, Tuple
import logging

logger = logging.getLogger(__name__)


class ToxicityDetector:
    """Detect toxic content using transformer models, with Hinglish rule‑based enhancement."""
    
    def __init__(self, model_name: str = "unitary/toxic-bert"):
        """
        Initialize toxicity detector.
        
        Args:
            model_name: HuggingFace model name (default: unitary/toxic-bert)
        """
        logger.info(f"Loading toxicity model: {model_name}")
        self.model_name = model_name

        if torch is None or AutoTokenizer is None or AutoModelForSequenceClassification is None:
            raise RuntimeError(
                "Toxicity model dependencies are not available. "
                "Install torch and transformers on a supported Python version."
            )

        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.model = AutoModelForSequenceClassification.from_pretrained(model_name)
            self.model.to(self.device)
            self.model.eval()
            logger.info(f"✅ Toxicity model loaded successfully on {self.device}")
        except Exception as e:
            logger.error(f"❌ Failed to load toxicity model: {e}")
            raise

        # Rule‑based patterns for Hinglish / Hindi abuse
        self.hinglish_patterns = [
            r"(chutiya|madarchod|bhosdike|bhenchod|gandu|harami|kutta|saala|kamina)",
            r"(mc|bc|bsdk|bkl|lodu|chomu)",
            r"(teri maa ki|teri behen ki|maa chod|behen chod)",
            r"(chakke|hijra|lavde|lund)",
            # Symbol obfuscation versions (will be handled by normalize_text)
            r"ch[@#*a-z]*tiy[a-z]*",
            r"m[@#*a-z]*d[@#*a-z]*rch[@#*a-z]*d",
            r"b[@#*a-z]*hc[@#*a-z]*d",
            r"g[@#*a-z]*ndu",
        ]
        # Mapping for leetspeak / symbol normalization
        self.symbol_map = {
            '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't',
            '@': 'a', '#': 'h', '$': 's', '&': 'and', '*': '', '_': '',
        }

    def normalize_text(self, text: str) -> str:
        """
        Normalize text by:
        - Converting to lowercase
        - Replacing leetspeak numbers with letters
        - Removing common obfuscation symbols
        """
        text = text.lower()
        for num, letter in self.symbol_map.items():
            text = text.replace(num, letter)
        # Remove any remaining non‑alphanumeric characters (except spaces)
        text = re.sub(r'[^a-z0-9\s]', '', text)
        return text.strip()

    def rule_based_toxic(self, text: str) -> bool:
        """Check if the text matches any Hinglish abusive pattern."""
        cleaned = self.normalize_text(text)
        for pattern in self.hinglish_patterns:
            if re.search(pattern, cleaned):
                return True
        return False

    def predict(self, text: str, threshold: float = 0.5) -> Dict:
        """
        Predict toxicity for given text, enhanced with rule‑based detection.
        
        Args:
            text: Input text to analyze
            threshold: Toxicity threshold (0-1)
            
        Returns:
            Dictionary with toxicity score, categories, and is_toxic flag
        """
        try:
            # Tokenize input
            inputs = self.tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                max_length=512,
                padding=True
            ).to(self.device)

            # Get model predictions
            with torch.no_grad():
                outputs = self.model(**inputs)
                predictions = torch.sigmoid(outputs.logits).cpu().numpy()[0]

            # Map predictions to categories (toxic-bert labels)
            categories = {
                "toxic": float(predictions[0]) if len(predictions) > 0 else 0.0,
                "severe_toxic": float(predictions[1]) if len(predictions) > 1 else 0.0,
                "obscene": float(predictions[2]) if len(predictions) > 2 else 0.0,
                "threat": float(predictions[3]) if len(predictions) > 3 else 0.0,
                "insult": float(predictions[4]) if len(predictions) > 4 else 0.0,
                "identity_hate": float(predictions[5]) if len(predictions) > 5 else 0.0,
            }

            # Calculate overall toxicity score (max of all categories)
            toxicity_score = float(max(predictions)) if len(predictions) else 0.0
            is_toxic = toxicity_score >= threshold

            # Rule‑based override: if not toxic by model but patterns match, mark as toxic
            if not is_toxic and self.rule_based_toxic(text):
                logger.info(f"Rule‑based toxicity detected for: {text}")
                is_toxic = True
                # Set a high score (≥0.9) and add a custom category
                toxicity_score = max(toxicity_score, 0.9)
                # Optionally add a custom category like "hate_speech" or "insult"
                categories["hate_speech"] = 0.9

            return {
                "toxicity_score": toxicity_score,
                "is_toxic": is_toxic,
                "categories": categories,
                "threshold": threshold
            }

        except Exception as e:
            logger.error(f"Error in toxicity prediction: {e}")
            return {
                "toxicity_score": 0.0,
                "is_toxic": False,
                "categories": {},
                "error": str(e)
            }

    def get_top_categories(self, categories: Dict[str, float], top_k: int = 3) -> List[str]:
        """Get top K toxic categories (score > 0.3)."""
        sorted_cats = sorted(categories.items(), key=lambda x: x[1], reverse=True)
        return [cat for cat, score in sorted_cats[:top_k] if score > 0.3]