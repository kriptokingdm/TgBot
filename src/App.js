// src/App.js
import React from 'react';
import Welcome from './Welcome';
import Home from './Home';
import Profile from './Profile';
import History from './History';
import Help from './Help';
import AdminPanel from './AdminPanel';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = React.useState('welcome');

  // Проверяем авторизацию при загрузке
  React.useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userData = localStorage.getItem('currentUser');
    
    if (isLoggedIn === 'true' && userData) {
      setCurrentPage('home');
    }
  }, []);

  // Функция для навигации
  const navigateTo = (page) => {
    setCurrentPage(page);
  };

  // Рендерим текущую страницу
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'welcome':
        return <Welcome navigateTo={navigateTo} />;
      case 'home':
        return <Home navigateTo={navigateTo} />;
      case 'profile':
        return <Profile navigateTo={navigateTo} />;
      case 'history':
        return <History navigateTo={navigateTo} />;
      case 'help':
        return <Help navigateTo={navigateTo} />;
      case 'admin':
        return <AdminPanel navigateTo={navigateTo} />;
      default:
        return <Welcome navigateTo={navigateTo} />;
    }
  };

  return (
    <div className="App">
      {renderCurrentPage()}
    </div>
  );
}

export default App;