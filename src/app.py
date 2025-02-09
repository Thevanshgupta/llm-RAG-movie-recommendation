# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import pymongo
import requests
import re

app = Flask(__name__)
CORS(app)

# MongoDB connection
client = pymongo.MongoClient("mongodb+srv://admin:admin@bloodbank.lppf54s.mongodb.net/?retryWrites=true&w=majority&appName=bloodbank")
db = client.sample_mflix
collection = db.movies

# Hugging Face token and embedding URL
hf_token = "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"
embedding_url = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2"

def generate_embedding(text: str) -> list[float]:
    response = requests.post(
        embedding_url,
        headers={"Authorization": f"Bearer {hf_token}"},
        json={"inputs": text}
    )
    if response.status_code != 200:
        raise ValueError(f"Request failed with status code {response.status_code}: {response.text}")
    return response.json()

def is_count_query(query: str) -> bool:
    # Detect if the user is asking for the total number of movies
    keywords = ["how many", "total movies", "count of movies", "number of movies"]
    return any(re.search(rf"\b{keyword}\b", query.lower()) for keyword in keywords)

@app.route('/api/vector-search', methods=['POST'])
def vector_search():
    try:
        data = request.json
        query = data.get('query', '').strip()

        if not query:
            return jsonify({"error": "Query is required"}), 400

        # Handle "how many movies" queries
        if is_count_query(query):
            total_movies = collection.count_documents({})
            return jsonify({
                "response_code": "200",
                "type": "count",
                "content": total_movies
            })

        # Handle vector search queries
        query_embedding = generate_embedding(query)
        results = collection.aggregate([
            {
                "$vectorSearch": {
                    "queryVector": query_embedding,
                    "path": "plot_embedding_hf",
                    "numCandidates": 100,
                    "limit": 10,  # Increased limit to 10
                    "index": "PlotSemanticSearch",
                }
            }
        ])

        movies = []
        for doc in results:
            movies.append({
                "title": doc.get("title", "N/A"),
                "plot": doc.get("plot", "N/A"),
                "languages": doc.get("languages", "N/A"),
                "released": doc.get("released", "N/A"),
                "year": doc.get("year", "N/A"),
                "imdb": doc.get("imdb", {}).get("rating", "N/A")
            })

        return jsonify({
            "response_code": "200",
            "type": "search",
            "content": movies
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000)