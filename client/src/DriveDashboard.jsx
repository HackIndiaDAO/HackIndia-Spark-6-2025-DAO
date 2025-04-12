// Dashboard.jsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

function DriveDashboard() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('user_id');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [indexedFiles, setIndexedFiles] = useState([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!query || !userId) return;
    setIsSearching(true);
    try {
      const res = await fetch(`http://localhost:5001/google/search?q=${query}&username=${userId}`);
      const data = await res.json();
      setResults(data);

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[Search Error] Status: ${res.status} - ${res.statusText}`);
        console.error(`[Search Error] Body: ${errorText}`);
      }
    } catch (error) {
      console.error('Error fetching search results:', error);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const fetchIndexedFiles = async () => {
      if (!userId) return;
      setIsLoadingFiles(true);
      try {
        const res = await fetch(`http://localhost:5001/google/list-files?username=${userId}`);
        const data = await res.json();
        setIndexedFiles(data);
      } catch (error) {
        console.error('Error fetching indexed files:', error);
      } finally {
        setIsLoadingFiles(false);
      }
    };

    fetchIndexedFiles();
  }, [userId]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>🔍 Search Your Indexed Documents</h1>
      <p><strong>User:</strong> {userId}</p>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Type your query..."
        style={{ padding: '0.5rem', width: '300px' }}
      />
      <button
        onClick={handleSearch}
        style={{ marginLeft: '1rem', padding: '0.5rem 1rem' }}
        disabled={isSearching}
      >
        {isSearching ? 'Searching...' : 'Search'}
      </button>

      <div style={{ marginTop: '3rem', textAlign: 'left', maxWidth: '700px', marginInline: 'auto' }}>
        <h2>📚 Indexed Files</h2>
        {isLoadingFiles ? (
          <p>Loading indexed files...</p>
        ) : indexedFiles.length === 0 ? (
          <p>No files indexed yet.</p>
        ) : (
          indexedFiles.map((file, i) => (
            <div key={i} style={{ padding: '1rem', borderBottom: '1px solid #ddd' }}>
              <strong>{file.file}</strong><br />
              <a href={file.link} target="_blank" rel="noopener noreferrer">🔗 View File</a>
            </div>
          ))
        )}
      </div>

      {results.length > 0 && (
        <div style={{ marginTop: '3rem', textAlign: 'left', maxWidth: '700px', marginInline: 'auto' }}>
          <h2>🔎 Search Results</h2>
          {results.map((r, i) => (
            <div key={i} style={{ padding: '1rem', borderBottom: '1px solid #ccc' }}>
              <h3>{r.file}</h3>
              <p><strong>Relevance:</strong> {r.relevance}%</p>
              <a href={r.link} target="_blank" rel="noopener noreferrer">📄 View File</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DriveDashboard;