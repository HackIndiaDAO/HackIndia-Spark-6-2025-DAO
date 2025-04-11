from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")
db = client["semantic_documents"]
collection = db["documents"]

def store_document(doc_id, content, embedding, filename, file_url, extension):
    collection.update_one(
        {"doc_id": doc_id},
        {
            "$set": {
                "doc_id": doc_id,
                "content": content,
                "embedding": embedding,
                "filename": filename,
                "file_url": file_url,
                "extension": extension,
                #"type": file_type  # still storing type info if you want to filter later
            }
        },
        upsert=True
    )

def get_all_embeddings():
    docs = list(collection.find({}, {"_id": 0, "doc_id": 1, "embedding": 1}))
    valid_embeddings = []
    valid_doc_ids = []

    for doc in docs:
        emb = doc.get("embedding")
        if isinstance(emb, list) and len(emb) == 512 and all(isinstance(x, (int, float)) for x in emb):
            valid_embeddings.append(emb)
            valid_doc_ids.append(doc["doc_id"])
        else:
            print(f"Skipping invalid embedding for doc_id: {doc['doc_id']}")

    return valid_embeddings, valid_doc_ids


def get_document_by_id(doc_id):
    doc = collection.find_one({"doc_id": doc_id}, {"_id": 0})
    if doc:
        return {
            "doc_id": doc["doc_id"],
            "content": doc.get("content", ""),
            "file_path": doc.get("file_url", ""),
            "embedding" : doc.get("embedding"),
            "extension": doc.get("extension", ""),
            "filename": doc.get("filename", "")
        }
    return None
