import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
from flask import Flask, request, jsonify
from flask_cors import CORS
import os, tempfile, mimetypes
import numpy as np
import faiss
from urllib.parse import quote
from appwrite.client import Client
from appwrite.services.storage import Storage
from appwrite.id import ID
from appwrite.input_file import InputFile

from embeddings.text_embedder import get_text_embedding,get_image_embedding
from utils.extractors import extract_text_from_pdf, extract_text_from_docx, extract_text_from_pptx, extract_text_from_txt
from utils.db import store_document, get_all_embeddings, get_document_by_id

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])

# 🔐 Appwrite Config
APPWRITE_ENDPOINT = 'https://cloud.appwrite.io/v1'
APPWRITE_PROJECT_ID = '67f8f3ec001b9bab4401'
APPWRITE_API_KEY = 'standard_57982c697d871e3720231468c44ff38eaf0b3c26ea47c1a2d374dc9159169e9c5aa897bfd6e8bc5fb4cde7699e60fc5fe7fbc601ddc430df77b4aacff9bb877d6d512e5618ce2b1e3ed3ff9f5dad9a8f30c885a430f657dfa056306956253bdeee580642648c64de5a525533558b9ae845326dc87c07e4d6ece4430da6e1b3e9'
APPWRITE_BUCKET_ID = '67f8f41800355a417754'

client = Client().set_endpoint(APPWRITE_ENDPOINT) \
                 .set_project(APPWRITE_PROJECT_ID) \
                 .set_key(APPWRITE_API_KEY)

storage = Storage(client)

os.makedirs("faiss_index", exist_ok=True)
index = faiss.IndexFlatL2(512)


def rebuild_index():
    embeddings, doc_ids = get_all_embeddings()
    if not embeddings:
        print("No valid embeddings found.")
        return
    xb = np.array(embeddings, dtype="float32")
    global index
    index.reset()
    index.add(xb)

    # Save locally
    temp_index_path = os.path.join(tempfile.gettempdir(), "index.faiss")
    faiss.write_index(index, temp_index_path)

    # Upload to Appwrite
    input_file = InputFile.from_path(temp_index_path)
    storage.create_file(
        bucket_id=APPWRITE_BUCKET_ID,
        file_id=ID.unique(),  # use fixed file_id to replace existing
        file=input_file
    )

    os.remove(temp_index_path)  # delete local copy
    print(f"Rebuilt and uploaded FAISS index with {len(xb)} embeddings.")
def download_index_from_appwrite():
    try:
        index_file = storage.get_file_download(bucket_id=APPWRITE_BUCKET_ID, file_id="faiss-index")
        temp_index_path = os.path.join(tempfile.gettempdir(), "index.faiss")

        with open(temp_index_path, "wb") as f:
            f.write(index_file)

        return temp_index_path
    except Exception as e:
        print("Failed to download FAISS index:", e)
        return None



def get_preview_link(file_url, ext):
    encoded_url = quote(file_url, safe='')
    if ext in [".docx", ".pptx"]:
        return f"https://view.officeapps.live.com/op/embed.aspx?src={encoded_url}"
    elif ext == ".pdf":
        return f"https://docs.google.com/gview?url={encoded_url}&embedded=true"
    return file_url  # fallback for unsupported preview types


@app.route("/upload", methods=["POST"])
def upload_file():
    doc_id = request.form.get("doc_id")
    file = request.files.get("file")
    if not file or not doc_id:
        return jsonify({"error": "Missing file or doc_id"}), 400

    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()
    temp_path = os.path.join(tempfile.gettempdir(), filename)
    file.save(temp_path)

    try:
        # Upload to Appwrite using InputFile
        input_file = InputFile.from_path(temp_path)

        result = storage.create_file(
            bucket_id=APPWRITE_BUCKET_ID,
            file_id=ID.unique(),
            file=input_file
        )

        file_id = result['$id']
        file_url = f"{APPWRITE_ENDPOINT}/storage/buckets/{APPWRITE_BUCKET_ID}/files/{file_id}/view?project={APPWRITE_PROJECT_ID}"
        preview_url = get_preview_link(file_url, ext)

        content, embedding = "", None
        if ext == ".pdf":
            content = extract_text_from_pdf(temp_path)
        elif ext == ".docx":
            content = extract_text_from_docx(temp_path)
        elif ext == ".pptx":
            content = extract_text_from_pptx(temp_path)
        elif ext == ".txt":
            content = extract_text_from_txt(temp_path)
        elif ext in [".jpg", ".jpeg", ".png"]:
            content = f"[Image] {filename}"
            embedding = get_image_embedding(temp_path)
        else:
            return jsonify({"error": "Unsupported file type"}), 400

        if not embedding and content:
            embedding = get_text_embedding(content)

        store_document(doc_id, content, embedding, filename, preview_url, ext)
        print("hi")
        rebuild_index()

        return jsonify({
            "message": f"{filename} uploaded and indexed.",
            "viewer_url": preview_url
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/query", methods=["POST"])
def query():
    query_text = request.json.get("query")
    if not query_text:
        return jsonify({"error": "Query text missing"}), 400

    try:
        print("reacht")
        query_embedding = get_text_embedding(query_text)
        print("hello")
        query_vector = np.array([query_embedding], dtype="float32")


        index_path = download_index_from_appwrite()
        if not index_path:
            return jsonify({"results": [], "message": "No index found"}), 400

        index = faiss.read_index(index_path)
        os.remove(index_path)
        distances, indices = index.search(query_vector, 10)  # Top 10 to allow fallback

        _, doc_ids = get_all_embeddings()
        results = []

        for dist, idx in zip(distances[0], indices[0]):
            print("hikfs")
            if idx < len(doc_ids):
                print("yacht")
                doc_data = get_document_by_id(doc_ids[idx])
                if doc_data and doc_data.get("embedding"):
                    print("yeshjwf")

                    #Convert L2 distance to cosine similarity (optional)
                    doc_embedding = np.array(doc_data["embedding"], dtype="float32")
                    q_norm = np.linalg.norm(query_embedding)
                    d_norm = np.linalg.norm(doc_embedding)
                    cosine_similarity = float(np.dot(query_embedding, doc_embedding) / (q_norm * d_norm))
                    similarity = round(1 / (1 + float(dist)), 4)

                    results.append({
                        "doc_id": doc_data["doc_id"],
                        "content_snippet": doc_data["content"][:300] + "...",
                        "file_path": doc_data["file_path"],
                        "extension": doc_data["extension"],
                        "file_name": doc_data["filename"],
                        "similarity": cosine_similarity
                    })
        print(results)

        return jsonify({"results": results})
    
    except Exception as e:
        print("Error in /query:", e)
        return jsonify({"error": str(e)}), 500

@app.route("/query/image", methods=["POST"])
def image_query():
    file = request.files.get("image")
    if not file:
        return jsonify({"error": "No image file provided"}), 400

    try:
        # Save the uploaded image temporarily
        temp_path = os.path.join(tempfile.gettempdir(), file.filename)
        file.save(temp_path)

        # Generate image embedding
        query_embedding = get_image_embedding(temp_path)
        query_vector = np.array([query_embedding], dtype="float32")


        index_path = download_index_from_appwrite()
        if not index_path:
            return jsonify({"results": [], "message": "No index found"}), 400

        index = faiss.read_index(index_path)
        os.remove(index_path)
        distances, indices = index.search(query_vector, 10)

        _, doc_ids = get_all_embeddings()
        results = []

        for dist, idx in zip(distances[0], indices[0]):
            if idx < len(doc_ids):
                doc_data = get_document_by_id(doc_ids[idx])
                if doc_data and doc_data.get("embedding"):
                    doc_embedding = np.array(doc_data["embedding"], dtype="float32")
                    q_norm = np.linalg.norm(query_embedding)
                    d_norm = np.linalg.norm(doc_embedding)
                    cosine_similarity = float(np.dot(query_embedding, doc_embedding) / (q_norm * d_norm))
                    similarity = round(1 / (1 + float(dist)), 4)

                    results.append({
                        "doc_id": doc_data["doc_id"],
                        "content_snippet": doc_data["content"][:300] + "...",
                        "file_path": doc_data["file_path"],
                        "extension": doc_data["extension"],
                        "file_name": doc_data["filename"],
                        "similarity": cosine_similarity
                    })

        return jsonify({"results": results})

    except Exception as e:
        print("Error in /image-query:", e)
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
