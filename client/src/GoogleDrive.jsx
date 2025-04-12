// App.jsx
import { useEffect, useState } from 'react';

function GoogleDrive() {
  const [authUrl, setAuthUrl] = useState('');

  useEffect(() => {
    fetch('http://localhost:5001/google/auth-url')
      .then(res => res.json())
      .then(data => setAuthUrl(data.url));
  }, []);

  return (
    <div style={{  textAlign: 'center' }}>
      <p style={{fontSize:"40px"}}>📄 Google Drive PDF Indexer</p>
      <a href={authUrl}>
        <button style={{ padding: '1rem 2rem', fontSize: '1.2rem' }}>
          Authenticate with Google
        </button>
      </a>
    </div>
  );
}

export default GoogleDrive;