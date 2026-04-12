import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import axios from 'axios'; // 👈 1. ADD THIS IMPORT

// 🛡️ 2. ADD THIS LINE: It forces every single Axios request in the entire app to include cookies!
axios.defaults.withCredentials = true; 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)