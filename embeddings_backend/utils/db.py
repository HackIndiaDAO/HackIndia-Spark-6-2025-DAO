from pymongo import MongoClient
from datetime import datetime

client = MongoClient("mongodb://localhost:27017/")
db = client["semantic_documents"]
collection = db["documents"]

from datetime import datetime

def store_document(doc_id, content, embedding, filename, file_url, extension, user_email, time_stamp):
    """
    Stores a document for a specific user using email as a key.
    """
    username = user_email.split("@")[0]
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    file_id = f"{username}_{timestamp}"

    # Prepare the document to insert
    document = {
        "doc_id": doc_id,
        "content": content,
        "embedding": embedding,
        "filename": filename,
        "file_url": file_url,
        "extension": extension,
        "file_id": file_id,
        "user_email": user_email,
        "time_stamp": time_stamp
    }

    # Insert the new document into the collection
    collection.insert_one(document)
    
    return file_id


def get_all_embeddings(email):
    """
    Fetches all valid embeddings belonging to a specific user.
    """
    
    docs = list(collection.find({"user_email": email}, {"_id": 0, "doc_id": 1, "embedding": 1}))
    valid_embeddings = []
    valid_doc_ids = []
    for doc in docs:
        print(doc)
        emb = doc.get("embedding")
        if isinstance(emb, list) and len(emb) == 512 and all(isinstance(x, (int, float)) for x in emb):
            print("ostundi")
            valid_embeddings.append(emb)
            valid_doc_ids.append(doc["doc_id"])
        else:
            print(f"Skipping invalid embedding for doc_id: {doc['doc_id']}")
    print("_______________________________")
    print(valid_doc_ids)

    return valid_embeddings, valid_doc_ids


def get_document_by_id(email, doc_id):
    """
    Fetches a specific document belonging to a specific user.
    """
    doc = collection.find_one({"user_email": email, "doc_id": doc_id}, {"_id": 0})
    if doc:
        return {
            "doc_id": doc["doc_id"],
            "content": doc.get("content", ""),
            "file_path": doc.get("file_url", ""),
            "embedding": doc.get("embedding"),
            "extension": doc.get("extension", ""),
            "filename": doc.get("filename", "")
        }
    return None
