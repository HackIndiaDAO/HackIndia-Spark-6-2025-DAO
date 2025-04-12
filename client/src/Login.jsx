// src/components/Login.jsx
import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'
import FileUpload from './FileUpload';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    const body = { email, password };
    console.log(body);

    try {
      console.log('sending');
      const res = await axios.post('http://localhost:5001/api/auth/login', body);
      const { token, email } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('email', email);
      setMessage('Login successful!');
      setLoggedIn(true);
      navigate('upload') // 👈 Trigger App to update view
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.error || 'Login failed.');
    }
  };

  return (
    <div>
        {!loggedIn ? (
            <div>
             <h2>🔐 Login</h2>
             <form onSubmit={handleLogin} style={{ maxWidth: '300px' }}>
               <input
                 type="email"
                 placeholder="Email"
                 value={email}
                 required
                 onChange={(e) => setEmail(e.target.value)}
                 style={{ display: 'block', marginBottom: '10px', padding: '8px', width: '100%' }}
               />
               <input
                 type="password"
                 placeholder="Password"
                 value={password}
                 required
                 onChange={(e) => setPassword(e.target.value)}
                 style={{ display: 'block', marginBottom: '10px', padding: '8px', width: '100%' }}
               />
               <button type="submit" style={{ padding: '10px', backgroundColor: '#007BFF', color: '#fff' }}>
                 Login
               </button>
             </form>
             {message && (
               <p style={{ marginTop: '10px', color: message.includes('successful') ? 'green' : 'red' }}>
                 {message}
               </p>
             )}
             </div>
        ) : (
            <FileUpload/>
        )}
     
    </div>
  );
};

export default Login;
