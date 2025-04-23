import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './App.css';

const tg = window.Telegram.WebApp;

function Home({ balance, toggleBalanceVisibility, isBalanceVisible, handleCurrencyChange }) {
    const getDisplayedBalance = () => {
        if (!isBalanceVisible) return '****';
        return `${balance} RUB`; // Здесь можно добавить логику для отображения валюты
    };

    return (
        <div>
            <div className="currency-selector">
                <button onClick={() => handleCurrencyChange('RUB')}>RUB</button>
                <button onClick={() => handleCurrencyChange('USD')}>USD</button>
                <button onClick={() => handleCurrencyChange('EUR')}>EUR</button>
            </div>
        </div>
    );
}

function QuickExchange() {
    return (
        <div>
            <h2>Быстрый обмен</h2>
            <p>Здесь будет форма для быстрого обмена.</p>
        </div>
    );
}

function MyOrders() {
    return (
        <div>
            <h2>Мои ордера</h2>
            <p>Здесь будет список ваших ордеров.</p>
        </div>
    );
}

function Settings() {
    return (
        <div>
            <h2>Настройки</h2>
            <p>Здесь будут настройки вашего профиля.</p>
        </div>
    );
}

function App() {
    const [balance, setBalance] = useState(1000);
    const [isBalanceVisible, setIsBalanceVisible] = useState(true);
    const [currency, setCurrency] = useState('RUB');

    const toggleBalanceVisibility = () => {
        setIsBalanceVisible(!isBalanceVisible);
    };

    const handleCurrencyChange = (newCurrency) => {
        setCurrency(newCurrency);
    };

    useEffect(() => {
        tg.ready();
    }, []);

    return (
        <Router>
            <div className="App">
                {/* Заголовок теперь выше */}
                <h1 className="app-title">TetherRabbit🥕</h1>

                {/* Баланс теперь под заголовком */}
                <div className="balance-container">
                    {isBalanceVisible ? `${balance} ${currency}` : '****'}
                    {/* Кнопка теперь справа от баланса */}
                    <button onClick={toggleBalanceVisibility} className="eye-button" aria-label="Toggle balance visibility">
                        {isBalanceVisible ? '👁️' : '🙈'}
                    </button>
                </div>

                {/* Убрали полупрозрачный текст под балансом */}
                
                {/* Убрали Home из основного контента */}
                <div className="tab-container">
                    {/* Изменили порядок кнопок */}
                    <Link to="/quick-exchange" className="tab-button">Быстрый обмен</Link>
                    <Link to="/my-orders" className="tab-button">Мои ордера</Link>
                    <Link to="/settings" className="tab-button">Настройки</Link>
                </div>

                <div className="content">
                    {/* Заменили Switch на Routes */}
                    <Routes>
                        {/* Заменили Route с exact на просто Route */}
                        <Route path="/" element={<Home balance={balance} toggleBalanceVisibility={toggleBalanceVisibility} isBalanceVisible={isBalanceVisible} handleCurrencyChange={handleCurrencyChange} />} />
                        <Route path="/quick-exchange" element={<QuickExchange />} />
                        <Route path="/my-orders" element={<MyOrders />} />
                        <Route path="/settings" element={<Settings />} />
                    </Routes>
                </div>
            </div>
        </Router>
    );
}

export default App;