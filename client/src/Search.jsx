// src/components/Search.jsx
import { useState } from 'react';
import axios from 'axios';

const Search = () => {
  const [query, setQuery] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [results, setResults] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleTextSearch = async () => {
    if (!query) return;
    const email = localStorage.getItem('email');
    try {
      const res = await axios.post('http://localhost:5000/query', { query, email });
      setResults(res.data.results);
      if (res.data.message === 'No index found') {
        setErrorMessage('No documents uploaded yet.');
      }
    } catch (error) {
      console.error('Error fetching results:', error);
    }
  };

  const handleImageSearch = async () => {
    if (!imageFile) return;
    const email = localStorage.getItem('email');

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('email', email);

    try {
      const res = await axios.post('http://localhost:5000/query/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResults(res.data.results);
    } catch (error) {
      console.error('Error fetching image results:', error);
    }
  };

  const uniqueResults = Array.from(
    new Map(results.map((item) => [item.doc_id, item])).values()
  );

  const aboveThreshold = uniqueResults
    .filter((item) => item.similarity >= 0.3)
    .sort((a, b) => b.similarity - a.similarity);

  const fallbackResults = uniqueResults
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);

  const displayResults = aboveThreshold.length > 0 ? aboveThreshold : fallbackResults;

  return (
    <div style={{ padding: '20px' }}>
      <h2>🔍 Search Documents</h2>

      {/* Text Query */}
      <input
        type="text"
        placeholder="Enter your query..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ padding: '8px', width: '300px', marginRight: '10px' }}
      />
      <button onClick={handleTextSearch}>Search by Text</button>

      {/* Image Query */}
      <div style={{ marginTop: '20px' }}>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files[0])}
          style={{color:"#123458"}}
        />
        <button onClick={handleImageSearch} disabled={!imageFile} style={{ marginLeft: '70px',  color:"black"}}>
          Search by Image
        </button>
      </div>

      {/* Display Results */}
      {errorMessage ? (
        <div>{errorMessage}</div>
      ) : (
        <div style={{ marginTop: '30px' }}>
          {aboveThreshold.length === 0 && results.length > 0 && (
            <p style={{ fontStyle: 'italic', color: 'gray', marginBottom: '15px' }}>
              No highly similar documents found. Displaying the closest matches instead.
            </p>
          )}

          {displayResults.map((result) => (
            <div
              key={result.doc_id}
              style={{
                border: '1px solid #ccc',
                padding: '15px',
                marginBottom: '20px',
                borderRadius: '8px',
              }}
            >
              <p>
                <strong>{result.file_name}</strong>{' '}
                <span style={{ color: '#555' }}>
                  (Similarity: {(result.similarity * 100).toFixed(2)}%)
                </span>
              </p>
              <p>{result.content_snippet}</p>

              {/* Document preview links */}
              {['.pdf', '.docx', '.pptx'].includes(result.extension) && (
                <a
                  href={result.file_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    marginTop: '10px',
                    color: 'blue',
                    textDecoration: 'underline',
                  }}
                >
                  📄 Preview in new tab
                </a>
              )}

              {/* Image preview */}
              {['.jpg', '.jpeg', '.png'].includes(result.extension) && (
                <img
                  src={result.file_path}
                  alt="Preview"
                  style={{ maxWidth: '300px', cursor: 'pointer', marginTop: '10px' }}
                />
              )}

              {/* Fallback for other file types */}
              {!['.jpg', '.jpeg', '.png', '.pdf', '.docx', '.pptx'].includes(result.extension) && (
                <a
                  href={result.file_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    marginTop: '10px',
                    color: 'blue',
                    textDecoration: 'underline',
                  }}
                >
                  Open {result.extension.toUpperCase()} File
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Search;
