// src/App.js
import React from 'react';
import './App.css';

function App() {
  return (
    <div style={{
      padding: '40px',
      textAlign: 'center',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ color: '#333', fontSize: '32px' }}>🤖 TetherBot</h1>
      <p style={{ color: '#666', fontSize: '18px' }}>Фронтенд работает!</p>
      <button 
        onClick={() => alert('React работает!')}
        style={{
          padding: '12px 24px',
          background: '#007cff',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          cursor: 'pointer',
          marginTop: '20px'
        }}
      >
        Тестовая кнопка
      </button>
    </div>
  );
}

export default App;