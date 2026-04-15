from sentence_transformers import SentenceTransformer, util
import torch

# Load the sentence-transformers model at module level so it doesn't reload on every request
model = SentenceTransformer('all-MiniLM-L6-v2')

DISTORTION_DATA = {
    "Catastrophizing": {
        "explanation": "Expecting the worst possible outcome or exaggerating the negative consequences of an event.",
        "examples": [
            "This will ruin my entire life",
            "I'm going to lose my job over this tiny mistake",
            "It's all completely over for me now",
            "This is the worst thing that could possibly happen",
            "My entire future is essentially destroyed"
        ]
    },
    "Overgeneralization": {
        "explanation": "Taking an isolated negative event and assuming it represents a constant, unchanging pattern.",
        "examples": [
            "I always mess everything up",
            "Nobody ever listens to what I have to say",
            "Every single time I try, I fail",
            "People never care about my feelings",
            "I always get rejected by everyone"
        ]
    },
    "Black and white thinking": {
        "explanation": "Seeing things in absolutes, assuming something is entirely good or entirely bad.",
        "examples": [
            "If I don't get a perfect score, I'm a total failure",
            "I have to do this flawlessly or not do it at all",
            "She is either entirely good or entirely evil",
            "It's completely pointless if it's not a hundred percent right",
            "I am either a complete success or a miserable loser"
        ]
    },
    "Mind reading": {
        "explanation": "Assuming you know what others are thinking or feeling without evidence.",
        "examples": [
            "They probably think I'm completely stupid",
            "I just know everyone is judging me behind my back",
            "He didn't reply, so he must be furious with me",
            "People always look at me and think I'm weird",
            "She must think I am incompetent"
        ]
    },
    "Fortune telling": {
        "explanation": "Predicting that things will turn out badly, often ignoring evidence to the contrary.",
        "examples": [
            "I'm definitely going to fail the exam tomorrow",
            "This relationship is inevitably going to end in a disaster",
            "I just know everything will go wrong on the trip",
            "There's no way this project will ever succeed",
            "I know I will embarrass myself in the meeting"
        ]
    },
    "Personalization": {
        "explanation": "Blaming yourself for events beyond your control or taking things too personally.",
        "examples": [
            "It's all my fault that the team lost the game",
            "They are in a bad mood, it must be because of something I did",
            "I caused this whole disaster to happen",
            "Everything always goes wrong because of me",
            "I ruined the entire party by just being there"
        ]
    },
    "Emotional reasoning": {
        "explanation": "Believing that because you feel a specific negative emotion, it must be true.",
        "examples": [
            "I feel like a total idiot, so I must be one",
            "I'm feeling so overwhelmed, which means this situation is impossible",
            "I feel guilty, therefore I must have done something incredibly wrong",
            "Because I feel anxious, I know something dangerous is about to happen",
            "I feel like an imposter, so I definitely don't belong here"
        ]
    },
    "Filtering": {
        "explanation": "Focusing exclusively on the negative aspects of a situation while ignoring the positives.",
        "examples": [
            "I got one negative comment, so my entire presentation was garbage",
            "Nothing good ever happens in my life, only bad things",
            "All I can see are the flaws and mistakes I've made",
            "I just can't focus on any positive feedback, only the criticism",
            "Despite the praise, I can only think about the one thing I messed up"
        ]
    }
}

# Pre-encode all example phrases at module load time for efficiency
for distortion, data in DISTORTION_DATA.items():
    data["encoded_examples"] = model.encode(data["examples"], convert_to_tensor=True)

def detect_cognitive_distortions(text):
    """
    Detects cognitive distortions in the given text using semantic similarity via sentence-transformers.
    Returns a list of dictionaries with distortion name, matched phrase, and explanation.
    """
    if not text or not text.strip():
        return []
        
    text_embedding = model.encode(text, convert_to_tensor=True)
    detected = []
    
    for distortion, data in DISTORTION_DATA.items():
        # Compute cosine similarity between the input text and all examples for this distortion type
        cosine_scores = util.cos_sim(text_embedding, data["encoded_examples"])[0]
        
        # Find the best matching example
        max_score_idx = torch.argmax(cosine_scores).item()
        max_score = cosine_scores[max_score_idx].item()
        
        # Flag distortion if similarity exceeds 0.45 threshold
        if max_score > 0.45:
            detected.append({
                "name": distortion,
                "matched_phrase": data["examples"][max_score_idx],
                "explanation": data["explanation"],
                "score": max_score
            })
            
    # Sort detected distortions by similarity score descending
    detected.sort(key=lambda x: x["score"], reverse=True)
    
    # Strip the score to maintain the original expected output format
    results = []
    for item in detected:
        results.append({
            "name": item["name"],
            "matched_phrase": item["matched_phrase"],
            "explanation": item["explanation"]
        })
        
    return results
