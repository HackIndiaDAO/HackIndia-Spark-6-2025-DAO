from sentence_transformers import SentenceTransformer
from PIL import Image
import numpy as np

# Load CLIP model (512 dimensions)
model = SentenceTransformer("")

def get_text_embedding(text):
    print(len(model.encode(text).tolist()))

def get_image_embedding(image_path):
    img = Image.open(image_path).convert("RGB")
    return model.encode(img).tolist()
