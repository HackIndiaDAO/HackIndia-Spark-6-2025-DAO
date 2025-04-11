import torch
import open_clip
from PIL import Image
from torchvision import transforms

# Load OpenCLIP model
model_name = "ViT-B-32"  # You can also try "ViT-L-14" or others
pretrained = "laion2b_s34b_b79k"  # Best available checkpoint
model, _, preprocess = open_clip.create_model_and_transforms(model_name, pretrained=pretrained)
tokenizer = open_clip.get_tokenizer(model_name)

device = "cuda" if torch.cuda.is_available() else "cpu"
model = model.to(device)
model.eval()

# Function to get text embedding
def get_text_embedding(text):
    with torch.no_grad():
        text_tokens = tokenizer([text]).to(device)
        text_features = model.encode_text(text_tokens)
        return text_features.cpu().numpy().flatten().tolist()

# Function to get image embedding
def get_image_embedding(image_path):
    image = Image.open(image_path).convert("RGB")
    image_tensor = preprocess(image).unsqueeze(0).to(device)
    with torch.no_grad():
        image_features = model.encode_image(image_tensor)
        return image_features.cpu().numpy().flatten().tolist()
