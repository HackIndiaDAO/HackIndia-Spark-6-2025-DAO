// src/components/FileUpload.jsx
import { useState } from 'react';
import axios from 'axios';
import Search from './Search';
import QueryInput from './QueryInput';
import GoogleDrive from './GoogleDrive';
import NurseBot from './NurseBot';

const FileUpload = () => {
  const [docId, setDocId] = useState('');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!docId || !file) {
      setMessage('Both Document ID and File are required.');
      return;
    }

    const formData = new FormData();
    formData.append('doc_id', docId);
    formData.append('file', file);
    formData.append('email', localStorage.getItem('email'));

    try {
      const res = await axios.post('http://localhost:5000/upload', formData);
      setMessage(res.data.message);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Upload failed.');
    }
  };

  return (
    <div className='fileUpload' style={{marginLeft : "50px"}}>
      <h2>📤 Upload Document</h2>
      <form onSubmit={handleUpload}>
        <input
          type="text"
          placeholder="Document ID"
          value={docId}
          onChange={(e) => setDocId(e.target.value)}
        />
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        <button type="submit">Upload</button>
      </form>
      <p>{message}</p>
    </div>
  );
};

export default FileUpload;
