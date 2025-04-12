from sentence_transformers import SentenceTransformer
import numpy as np
import faiss
import requests
from newspaper import Article
import pdfplumber
import io
import google.generativeai as genai

genai.configure(api_key="GEN_AI_API_KEY")

# ----------------- Keyword Extraction ------------------
def get_related_keywords(query, top_n=5):
    try:
        prompt = f"""
Given the query: "{query}", suggest {top_n} semantically related search terms or topics.
These should be useful for finding helpful resources online and can include synonyms, subtopics, or broader concepts.
Return them as a simple comma-separated list.
"""
        model = genai.GenerativeModel("gemini-1.5-pro")
        response = model.generate_content(prompt)
        keywords = [kw.strip() for kw in response.text.split(',') if kw.strip()]
        return keywords[:top_n]
    except Exception as e:
        print(f"Gemini keyword generation error: {e}")
        return [query]

# ----------------- Text Summarization ------------------
def summarize_text(text, query=None):
    try:
        trimmed_text = text[:4000]
        prompt = f"""You are an assistant helping summarize articles.

Summarize the following article in 3-4 sentences, focused on the topic: "{query}". 
Be concise, informative, and helpful.

Article:
{trimmed_text}
"""
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Gemini summary error: {e}")
        fallback = text.strip().split('\n')[0]
        return fallback[:300] + "..." if fallback else "Summary unavailable."

# ----------------- Resource Recommendation ------------------
def resource_recommendation(query):
    model = SentenceTransformer('all-MiniLM-L6-v2')
    query_embedding = model.encode(query)

    SERP_API_KEY = 'SERP_API_KEY'
    related_keywords = get_related_keywords(query)
    search_terms = [query] + related_keywords

    results = []
    for term in search_terms:
        print(f"Fetching resources for: {term}")
        params = {
            "q": term,
            "num": 1,
            "api_key": SERP_API_KEY,
            "engine": "google"
        }
        try:
            response = requests.get("https://serpapi.com/search", params=params).json()
            results.extend(response.get("organic_results", []))
        except Exception as e:
            print(f"SERP API error for {term}: {e}")

    def get_full_content(url):
        try:
            response = requests.get(url, timeout=7)
            content_type = response.headers.get('Content-Type', '')

            if 'application/pdf' in content_type:
                with pdfplumber.open(io.BytesIO(response.content)) as pdf:
                    return ' '.join([page.extract_text() or "" for page in pdf.pages])

            if 'application/msword' in content_type or 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' in content_type:
                return "[DOCX parsing needed]"

            article = Article(url)
            article.download()
            article.parse()
            return article.text
        except Exception as e:
            print(f"Error processing {url}: {e}")
            return ""

    documents = []
    doc_texts = []

    for item in results:
        title = item.get("title", "")
        url = item.get("link", "")
        print(f"Fetching: {url}")
        content = get_full_content(url)
        summary = summarize_text(content, query)
        combined_text = f"{title}\n{summary}"
        documents.append((combined_text, url, summary))
        doc_texts.append(combined_text)

    if not doc_texts:
        return [{"url": "", "preview": "No content found."}], related_keywords

    doc_embeddings = model.encode(doc_texts)
    dimension = doc_embeddings.shape[1]

    index = faiss.IndexFlatL2(dimension)
    index.add(np.array(doc_embeddings))

    k = min(5, len(doc_texts))
    _, indices = index.search(np.array([query_embedding]), k)

    top_results = []
    for idx in indices[0]:
        text, url, summary = documents[idx]
        top_results.append({
            "url": url,
            "preview": summary
        })

    return top_results, related_keywords