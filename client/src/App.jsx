import './App.css';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import FileUpload from './FileUpload';
import Search from './Search';
import QueryInput from './QueryInput';
import GoogleDrive from './GoogleDrive';
import NurseBot from './NurseBot';
import DriveDashboard from './DriveDashboard';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-wrapper">
      <div className="home-container">
        <h1 className="main-title">📁🩺Dr.Docs</h1>
        <div className="button-grid">
          <button onClick={() => navigate('/upload')}>📤 File Upload</button>
          <button onClick={() => navigate('/search')}>🔍 Search</button>
          <button onClick={() => navigate('/query')}>💬 Query Input</button>
          <button onClick={() => navigate('/gdrive')}>📄 Google Drive</button>
          <button onClick={() => navigate('/nurse')}>👩‍⚕️NurseBot</button>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/upload" element={<Centered><FileUpload /></Centered>} />
        <Route path="/search" element={<Centered><Search /></Centered>} />
        <Route path="/query" element={<Centered><QueryInput /></Centered>} />
        <Route path="/gdrive" element={<Centered><GoogleDrive /></Centered>} />
        <Route path="/nurse" element={<Centered><NurseBot /></Centered>}/>
        <Route path='/dashboard' element={<Centered><DriveDashboard/></Centered>}/>
      </Routes>
    </Router>
  );
}

function Centered({ children }) {
  return <div className="centered-box">{children}</div>;
}

export default App;
