import os
import time
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
from NurseBot_ import load_file, chunk_text, build_index, ask_question, load_docx, load_pdf, load_txt, load_pptx, load_excel
from docx import Document
from googleDrive import index_file_logic, search_docs_logic, list_files_logic
from pydantic import BaseModel
from flask import Flask, request, jsonify
from flask_cors import CORS
from fileUpload import upload_file_handler, query_handler, image_query_handler
from external_links import resource_recommendation
class FileIndexRequest(BaseModel):
    token: dict
    file_id: str
    name: str
    mimeType: str
app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"])

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

stored_index = None
stored_chunks = None

@app.route("/upload", methods=["POST"])
def upload_file():
    return upload_file_handler(request)

@app.route("/query", methods=["POST"])
def query():
    return query_handler(request)

@app.route("/query/image", methods=["POST"])
def image_query():
    return image_query_handler(request)
@app.route('/search', methods=['POST'])
def search():
    start_time = time.time()
    data = request.json
    query = data.get("query", "")
    results, related_keywords = resource_recommendation(query)
    duration = round(time.time() - start_time, 2)
    print(f"Search completed in {duration} seconds")
    
    return jsonify({
        "results": results,
        "related_keywords": related_keywords
    })

@app.route("/index-file/", methods=["POST"])
def index_file():
    data = request.json
    validated = FileIndexRequest(**data)
    result = index_file_logic(validated)
    return jsonify(result)

@app.route("/search/", methods=["GET"])
def search_docs():
    query = request.args.get("query")
    username = request.args.get("username")
    alpha = float(request.args.get("alpha", 0.4))
    result = search_docs_logic(query, username, alpha)
    return jsonify(result)

@app.route("/list-files/", methods=["GET"])
def list_files():
    username = request.args.get("username")
    result = list_files_logic(username)
    return jsonify(result)

def load_file(file_path):
    if file_path.endswith(".docx"):
        return load_docx(file_path)
    elif file_path.endswith(".pdf"):
        return load_pdf(file_path)
    elif file_path.endswith(".txt"):
        return load_txt(file_path)
    elif file_path.endswith(".pptx"):
        return load_pptx(file_path)
    elif file_path.endswith(".xlsx") or file_path.endswith(".xls"):
        return load_excel(file_path)
    else:
        raise ValueError("Unsupported file format")



@app.route("/upload_to_nurse", methods=["POST"])
def upload_file_to_nurse():
    global stored_index, stored_chunks
    file = request.files['file']
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    try:
        doc_text = load_file(file_path)
        print(doc_text)  

        # Chunking the document text
        chunks = chunk_text(doc_text)

        # Building index and embeddings
        index, chunks, embeddings = build_index(chunks)
        stored_index = index
        print(stored_index)
        stored_chunks = chunks
        embeddings_list = embeddings.tolist()
        
        return jsonify({
            "status": "success",
            "index_length": index.ntotal,
            "chunks_count": len(chunks),
            "chunks": chunks,
            "embeddings_length": len(chunks),
            "embedding_shape": [index.d, len(chunks)],  # Index dimension and chunk length
            "embeddings": embeddings.tolist()  # Convert embeddings to a list (serializable)
        })

    except Exception as e:
        print(f"[ERROR] During upload: {str(e)}")
        return jsonify({"error": f"Document processing failed: {str(e)}"})

@app.route("/ask", methods=["POST"])
def ask():
    
    global stored_index, stored_chunks
    print(stored_index)
    if stored_index is None or stored_chunks is None:
        return jsonify({"error": "Please upload and process a document first."}), 400
    try:
        data = request.get_json()
        query = data.get("query")
        if not query or not isinstance(query, str):
            return jsonify({"error": "Query cannot be empty or invalid."}), 400

        answer = ask_question(query, stored_index, stored_chunks)

        return jsonify({"answer": answer})

    except Exception as e:
        print(f"[ERROR] During ask: {str(e)}")
        return jsonify({"error": f"Failed to process query: {str(e)}"}), 500



if __name__ == "__main__":
    app.run(debug=True, port=5000)
