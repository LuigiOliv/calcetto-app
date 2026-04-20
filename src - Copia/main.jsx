import React from 'react';
import ReactDOM from 'react-dom/client';

// Import styles
import './styles/index.css';

// Initialize Firebase FIRST (import and use to prevent tree-shaking)
import { db, auth } from './firebase.js';
console.log('Firebase initialized:', !!db, !!auth);

// Now import components
import App from './components/App.jsx';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  import.meta.env.DEV ? (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  ) : (
    <App />
  )
);
