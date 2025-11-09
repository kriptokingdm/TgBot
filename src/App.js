// src/App.js
import React, { useState, useEffect } from 'react';
import './App.css';
import Welcome from './Welcome';
import Home from './Home';
import Profile from './Profile';
import History from './History';
import Help from './Help';

// Проверяем импорты
console.log('Welcome type:', typeof Welcome);
console.log('Home type:', typeof Home);
console.log('Profile type:', typeof Profile);
console.log('History type:', typeof History);
console.log('Help type:', typeof Help);

function App() {
    const [currentPage, setCurrentPage] = useState('welcome');

    // Проверяем авторизацию при загрузке
    useEffect(() => {
        const loggedIn = localStorage.getItem('isLoggedIn');
        const userData = localStorage.getItem('currentUser');
        
        if (loggedIn === 'true' && userData) {
            setCurrentPage('home');
        }
    }, []);

    const navigateTo = (page) => {
        console.log('Navigating to:', page);
        setCurrentPage(page);
    };

    const handleLogin = () => {
        console.log('Login successful');
        setCurrentPage('home');
    };

    const renderPage = () => {
        console.log('Current page:', currentPage);
        
        switch (currentPage) {
            case 'welcome':
                return <Welcome navigateTo={handleLogin} />;
            case 'home':
                return <Home navigateTo={navigateTo} />;
            case 'profile':
                return <Profile navigateTo={navigateTo} />;
            case 'history':
                return <History navigateTo={navigateTo} />;
            case 'help':
                return <Help navigateTo={navigateTo} />;
            default:
                return <Welcome navigateTo={handleLogin} />;
        }
    };

    return (
        <div className="App">
            {renderPage()}
        </div>
    );
}

export default App;