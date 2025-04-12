import io, json, re
import faiss
import numpy as np
from PyPDF2 import PdfReader
from sentence_transformers import SentenceTransformer
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from appwrite.client import Client
from appwrite.services.storage import Storage
from appwrite.input_file import InputFile

model = SentenceTransformer('all-MiniLM-L6-v2')  # 384 dim

# Appwrite client setup
appwrite_client = Client()
appwrite_client.set_endpoint("API_END_POINT")
appwrite_client.set_project("PROJECT_ID")
appwrite_client.set_key("PROJECT_KEY")
storage = Storage(appwrite_client)

def get_creds(json_dict):
    return Credentials.from_authorized_user_info(json_dict)

def extract_text(file_id, mime_type, creds):
    service = build('drive', 'v3', credentials=creds)
    if mime_type == 'application/pdf':
        file = service.files().get_media(fileId=file_id).execute()
        reader = PdfReader(io.BytesIO(file))
        return "\n".join([page.extract_text() or '' for page in reader.pages])
    elif mime_type in ('application/vnd.google-apps.document', 'application/vnd.google-apps.presentation'):
        exported = service.files().export(fileId=file_id, mimeType='text/plain').execute()
        return exported.decode('utf-8')
    else:
        raise ValueError(f"Unsupported mimeType: {mime_type}")

def get_username_from_email(email):
    return email.split("@")[0]

def get_file_names(username, gdrive_file_id):
    trimmed_id = gdrive_file_id[:10]
    base = f"{username}_{trimmed_id}"
    return {
        "index": f"{base}_idx.index",
        "meta": f"{base}_mta.json"
    }

def save_index_and_metadata(index, metadata, username, gdrive_file_id):
    file_names = get_file_names(username, gdrive_file_id)
    faiss.write_index(index, file_names["index"])
    with open(file_names["meta"], "w") as f:
        json.dump(metadata, f)
    for fname in file_names.values():
        storage.create_file(bucket_id="BUCKET_ID", file_id=fname, file=InputFile.from_path(fname))

def load_index_and_metadata(username, gdrive_file_id):
    file_names = get_file_names(username, gdrive_file_id)
    local_index = file_names["index"]
    local_meta = file_names["meta"]
    try:
        index_bytes = storage.get_file_download(bucket_id="BUCKET_ID", file_id=local_index)
        with open(local_index, "wb") as f:
            if isinstance(index_bytes, bytes):
                f.write(index_bytes)
            elif isinstance(index_bytes, list):
                f.write(b"".join(index_bytes))
            else:
                raise TypeError(f"Unexpected type for index_bytes: {type(index_bytes)}")
        meta_result = storage.get_file_download(bucket_id="BUCKET_ID", file_id=local_meta)
        metadata = [meta_result] if isinstance(meta_result, dict) else meta_result
        index = faiss.read_index(local_index)
        return index, metadata
    except Exception as e:
        print(f"Error loading index/metadata for {username} - {gdrive_file_id}: {e}")
        return faiss.IndexFlatL2(384), []

def index_file_logic(data):
    creds = get_creds(data.token)
    text = extract_text(data.file_id, data.mimeType, creds)
    service = build('oauth2', 'v2', credentials=creds)
    user_info = service.userinfo().get().execute()
    username = get_username_from_email(user_info['email'])
    gdrive_file_id = data.file_id
    index, metadata = load_index_and_metadata(username, gdrive_file_id)
    if index is not None and metadata and len(metadata) > 0:
        return {"status": "already_indexed", "file": data.name}
    emb = model.encode(text)
    emb = emb / np.linalg.norm(emb)
    index.add(np.array([emb], dtype='float32'))
    metadata.append({
        "file": data.name,
        "id": data.file_id,
        "content": text
    })
    save_index_and_metadata(index, metadata, username, gdrive_file_id)
    return {"status": "indexed", "file": data.name}

def search_docs_logic(query, username, alpha=0.4):
    files = storage.list_files(bucket_id="BUCKET_ID").get('files', [])
    user_files = [f for f in files if f['$id'].startswith(f"{username}_") and f['$id'].endswith("_idx.index")]
    query_emb = model.encode(query)
    query_norm = np.linalg.norm(query_emb)
    results = []
    pattern = re.compile(rf"{re.escape(username)}_(.+?)_idx\.index")

    for index_file in user_files:
        match = pattern.match(index_file["$id"])
        if not match:
            continue
        gdrive_file_id = match.group(1)
        index, metadata = load_index_and_metadata(username, gdrive_file_id)
        if index.ntotal == 0 or not metadata:
            continue
        D, I = index.search(np.array([query_emb], dtype="float32"), k=1)
        i = int(I[0][0])
        if i >= index.ntotal or i >= len(metadata):
            continue
        try:
            chunk_emb = index.reconstruct(i)
            cosine_sim = np.dot(chunk_emb, query_emb) / (np.linalg.norm(chunk_emb) * query_norm + 1e-8)
        except:
            cosine_sim = 0.0
        faiss_distance = float(D[0][0])
        cosine_score = max(cosine_sim, 0.0)
        l2_score = np.exp(-faiss_distance)
        hybrid_score = alpha * cosine_score + (1 - alpha) * l2_score
        relevance_pct = round(hybrid_score * 100, 2)
        results.append({
            "file": metadata[i]["file"],
            "id": metadata[i]["id"],
            "score": relevance_pct,
            "link": f"https://drive.google.com/file/d/{metadata[i]['id']}/view"
        })

    return sorted(results, key=lambda x: x["score"], reverse=True)

def list_files_logic(username):
    files = storage.list_files(bucket_id="BUCKET_ID").get('files', [])
    user_files = [f for f in files if f['$id'].startswith(f"{username}_") and f['$id'].endswith("_mta.json")]
    results = []
    seen_ids = set()
    pattern = re.compile(rf"{re.escape(username)}_(.+?)_mta\.json")
    for meta_file in user_files:
        match = pattern.match(meta_file["$id"])
        if not match:
            continue
        gdrive_file_id = match.group(1)
        _, metadata = load_index_and_metadata(username, gdrive_file_id)
        if metadata:
            for meta in metadata:
                if meta["id"] not in seen_ids:
                    results.append({
                        "file": meta["file"],
                        "id": meta["id"],
                        "link": f"https://drive.google.com/file/d/{meta['id']}/view"
                    })
                    seen_ids.add(meta["id"])
    return sorted(results, key=lambda x: x["file"])