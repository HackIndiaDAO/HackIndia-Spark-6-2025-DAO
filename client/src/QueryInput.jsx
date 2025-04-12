import { useState } from 'react';
import axios from 'axios';
import './QueryInput.css';

function QueryInput() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [relatedKeywords, setRelatedKeywords] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (searchText = query) => {
    if (!searchText.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5001/api/resources/search', {
        query: searchText,
      });
      setResults(res.data.results || []);
      setRelatedKeywords(res.data.related_keywords || []);
    } catch (err) {
      console.error('Search failed', err);
    }
    setLoading(false);
  };

  return (
    <div className="query-box">
      <h1 className="query-heading">Semantic Resource Search</h1>

      <div className="query-input-container">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your query..."
          className="query-input"
        />
        <button onClick={() => handleSearch()} className="query-button">
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {loading && <p className="loading-text">Loading results...</p>}

      <div className="results-section">
        {results.map((item, index) => (
          <div key={index} className="result-card">
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="result-link">
              {item.url}
            </a>
            <p className="result-preview">{item.preview}</p>
          </div>
        ))}
      </div>

      {relatedKeywords.length > 0 && (
        <div className="related-section">
          <h2 className="related-heading">Related Topics</h2>
          <div className="related-keywords">
            {relatedKeywords.map((keyword, index) => (
              <button
                key={index}
                onClick={() => {
                  setQuery(keyword);
                  handleSearch(keyword);
                }}
                className="related-button"
              >
                {keyword}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default QueryInput;
