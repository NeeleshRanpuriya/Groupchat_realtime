
# DATASET DOCUMENTATION

## Overview
This directory contains curated datasets for training, testing, and demonstrating the real-time chat moderation system.

## Datasets

### 1. toxic_comments.csv
**Purpose**: Training data for toxicity detection model  
**Source**: Based on Kaggle Jigsaw Toxic Comment Classification Challenge  
**Records**: 30 sample comments with toxicity labels

**Columns**:
- `id`: Unique identifier
- `comment_text`: The message text
- `toxic`: Binary flag (1=toxic, 0=clean)
- `severe_toxic`: Severe toxicity flag
- `obscene`: Obscene content flag
- `threat`: Threatening content flag
- `insult`: Insulting content flag
- `identity_hate`: Identity-based hate flag

**Usage**:
```python
import pandas as pd
df = pd.read_csv('datasets/toxic_comments.csv')
toxic_samples = df[df['toxic'] == 1]
```

### 2. intent_classification.csv
**Purpose**: Training data for intent classification  
**Records**: 40 messages with labeled intents

**Columns**:
- `id`: Unique identifier
- `message`: The message text
- `intent`: Classified intent (question, complaint, insult, threat, positive, disagreement, neutral)
- `confidence`: Confidence score (0-1)

**Intent Categories**:
- **question**: Seeking information or clarification
- **complaint**: Expressing dissatisfaction
- **insult**: Insulting or disrespectful language
- **threat**: Threatening statements
- **positive**: Positive sentiment or gratitude
- **disagreement**: Disagreeing with a statement
- **neutral**: Neutral statements

**Usage**:
```python
import pandas as pd
df = pd.read_csv('datasets/intent_classification.csv')
questions = df[df['intent'] == 'question']
```

### 3. polite_rewrites.csv
**Purpose**: Training data for message rewriting  
**Records**: 40 toxic/rude messages with polite alternatives

**Columns**:
- `id`: Unique identifier
- `original_message`: The original (toxic/rude) message
- `polite_rewrite`: Professional/polite alternative
- `improvement_type`: Type of improvement (tone, professionalism, empathy, etc.)

**Improvement Types**:
- **tone**: General tone improvement
- **professionalism**: More professional phrasing
- **empathy**: Adding empathy and understanding
- **constructiveness**: Making criticism constructive
- **clarity**: Improving clarity
- **assertiveness**: Assertive but respectful
- **problem_solving**: Focus on solutions
- And more...

**Usage**:
```python
import pandas as pd
df = pd.read_csv('datasets/polite_rewrites.csv')
tone_improvements = df[df['improvement_type'] == 'tone']
```

## Data Collection Sources

### Primary Sources:
1. **Kaggle Jigsaw Challenge**: https://www.kaggle.com/c/jigsaw-toxic-comment-classification-challenge
2. **Manual Curation**: Custom examples for intent and rewrites

### Recommended Additional Datasets:
- **Hate Speech and Offensive Language**: https://github.com/t-davidson/hate-speech-and-offensive-language
- **Twitter Hate Speech**: https://github.com/ZeerakW/hatespeech
- **Civil Comments**: https://www.kaggle.com/c/jigsaw-unintended-bias-in-toxicity-classification

## Model Training Notes

### Toxicity Detection
- Model: `unitary/toxic-bert` (HuggingFace)
- Pre-trained on large-scale toxicity datasets
- Fine-tuning: Use toxic_comments.csv for domain-specific tuning

### Intent Classification
- Approach: Rule-based with keyword patterns
- Enhancement: Train custom classifier with intent_classification.csv
- Recommended: Use transformers for better accuracy

### Rewrite Generation
- Approach: OpenAI GPT-3.5 for context-aware rewrites
- Fallback: Rule-based substitutions
- Training: Fine-tune on polite_rewrites.csv for consistency

## Data Statistics

### toxic_comments.csv
- Total samples: 30
- Toxic: 18 (60%)
- Clean: 12 (40%)
- Contains threats: 5
- Contains insults: 16

### intent_classification.csv
- Total samples: 40
- Questions: 6 (15%)
- Complaints: 6 (15%)
- Insults: 8 (20%)
- Threats: 5 (12.5%)
- Positive: 6 (15%)
- Disagreements: 6 (15%)
- Neutral: 3 (7.5%)

### polite_rewrites.csv
- Total samples: 40
- Tone improvements: 12 (30%)
- Professionalism: 3 (7.5%)
- Empathy: 3 (7.5%)
- Other types: 22 (55%)

## Ethical Considerations

1. **Bias Awareness**: Datasets may contain cultural and linguistic biases
2. **Privacy**: All data is synthetic or from public datasets
3. **Context Sensitivity**: Some messages may be acceptable in certain contexts
4. **False Positives**: No model is perfect - human review is recommended
5. **Fair Representation**: Ensure diverse representation across demographics

## Extending Datasets

### Adding New Samples
```python
import pandas as pd

# Load existing dataset
df = pd.read_csv('datasets/toxic_comments.csv')

# Add new sample
new_row = {
    'id': len(df) + 1,
    'comment_text': 'Your new message here',
    'toxic': 1,
    'severe_toxic': 0,
    'obscene': 0,
    'threat': 0,
    'insult': 1,
    'identity_hate': 0
}

df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
df.to_csv('datasets/toxic_comments.csv', index=False)
```

## References

1. Jigsaw/Conversation AI - Toxic Comment Classification
2. Davidson et al. (2017) - Automated Hate Speech Detection
3. Founta et al. (2018) - Large Scale Crowdsourcing and Characterization of Twitter Abusive Behavior
4. Vidgen & Derczynski (2020) - Directions in Abusive Language Detection

## License

These datasets are provided for educational purposes (college project).  
Original Jigsaw data follows CC0: Public Domain license.
