import numpy as np
import spacy
from datasets import load_dataset
from transformers import (
    DistilBertTokenizerFast,
    DistilBertForSequenceClassification,
    Trainer,
    TrainingArguments
)
import evaluate

# Optional lemmatization with spaCy
# We download the model if not present, though assuming it'll be installed
try:
    nlp = spacy.load("en_core_web_sm", disable=["parser", "ner"])
except OSError:
    import spacy.cli
    spacy.cli.download("en_core_web_sm")
    nlp = spacy.load("en_core_web_sm", disable=["parser", "ner"])

def preprocess_text(text):
    """
    Lowercase text and apply optional lemmatization.
    Do NOT remove important words. Keep all tokens.
    """
    text = text.lower()
    doc = nlp(text)
    return " ".join([token.lemma_ for token in doc])

def main():
    # 1. Load the GoEmotions dataset
    print("Loading dataset...")
    dataset = load_dataset("go_emotions", "simplified")
    
    # Target emotions
    target_emotions = ["joy", "sadness", "anger", "fear", "love", "surprise"]
    
    # Get the original labels to determine indices
    label_names = dataset['train'].features['labels'].feature.names
    
    # Map from target emotion name to its original index in GoEmotions
    target_to_orig_idx = {emo: label_names.index(emo) for emo in target_emotions}
    # Map from original index back to 0-5 index for our new model
    orig_to_target_idx = {orig_idx: i for i, orig_idx in enumerate(target_to_orig_idx.values())}
    
    def filter_and_map_labels(example):
        """
        Filter out non-target emotions and convert to single-label
        by picking the first match.
        """
        # Find which of the original labels in this example are in our target set
        matched_orig_labels = [l for l in example['labels'] if l in orig_to_target_idx]
        
        if not matched_orig_labels:
            return {"label":-1,"keep": False}
        
        # Convert multi-label entries into single-label by selecting the first matching label
        first_match = matched_orig_labels[0]
        
        # Map the original label index to our new 0-5 index
        new_label_idx = orig_to_target_idx[first_match]
        
        return {"label": new_label_idx, "keep": True}
        
    print("Filtering and mapping dataset...")
    # Map the labels
    dataset = dataset.map(filter_and_map_labels)
    # Drop rows that do not contain these emotions
    dataset = dataset.filter(lambda x: x["keep"])
    
    # Remove unused columns
    cols_to_remove = ["labels", "keep", "id"]
    dataset = dataset.remove_columns([c for c in cols_to_remove if c in dataset["train"].column_names])
    
    # Apply text preprocessing
    def preprocess_dataset(example):
        example['text'] = preprocess_text(example['text'])
        return example
        
    print("Preprocessing text...")
    dataset = dataset.map(preprocess_dataset)
    
    # 2. Tokenize text using DistilBertTokenizerFast
    print("Tokenizing...")
    tokenizer = DistilBertTokenizerFast.from_pretrained("distilbert-base-uncased")
    
    def tokenize_function(examples):
        return tokenizer(examples['text'], padding="max_length", truncation=True, max_length=128)
        
    tokenized_datasets = dataset.map(tokenize_function, batched=True)
    
    # 3. Use DistilBertForSequenceClassification with num_labels=6
    id2label = {i: emo for i, emo in enumerate(target_emotions)}
    label2id = {emo: i for i, emo in enumerate(target_emotions)}
    
    model = DistilBertForSequenceClassification.from_pretrained(
        "distilbert-base-uncased",
        num_labels=6,
        id2label=id2label,
        label2id=label2id
    )
    
    # 4. Evaluate using accuracy and weighted F1-score
    accuracy_metric = evaluate.load("accuracy")
    f1_metric = evaluate.load("f1")
    
    def compute_metrics(eval_pred):
        logits, labels = eval_pred
        predictions = np.argmax(logits, axis=-1)
        acc = accuracy_metric.compute(predictions=predictions, references=labels)
        f1 = f1_metric.compute(predictions=predictions, references=labels, average="weighted")
        return {**acc, **f1}
        
    # 5. Train using HuggingFace Trainer API
    print("Setting up Trainer...")
    # We use validation set if available, else split test
    eval_split = "validation" if "validation" in tokenized_datasets else "test"
    
    training_args = TrainingArguments(
        output_dir="./distilbert_results",
        num_train_epochs=4,                 # epochs: 4
        per_device_train_batch_size=16,     # batch size: 16
        per_device_eval_batch_size=16,
        learning_rate=2e-5,                 # learning rate: 2e-5
        weight_decay=0.01,                  # weight decay: 0.01
        evaluation_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
    )
    
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_datasets["train"],
        eval_dataset=tokenized_datasets[eval_split],
        compute_metrics=compute_metrics,
    )
    
    print("Starting training...")
    trainer.train()
    
    # Evaluate at the end
    print("Evaluating...")
    print(trainer.evaluate())
    
    # 6. Save model, tokenizer, and label mappings into "saved_model"
    print("Saving model and tokenizer to 'saved_model' directory...")
    model.save_pretrained("saved_model")
    tokenizer.save_pretrained("saved_model")
    print("Training complete and model saved!")

if __name__ == "__main__":
    main()
