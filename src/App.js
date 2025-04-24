import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './App.css';
import QuickExchange from './QuickExchange'; // Убедитесь, что путь правильный
import Settings from './Settings'; // Импортируем новый компонент

const tg = window.Telegram.WebApp;

function Home({ balance, toggleBalanceVisibility, isBalanceVisible, handleCurrencyChange }) {
    const getDisplayedBalance = () => {
        return isBalanceVisible ? `${balance} RUB` : '****'; // Здесь можно добавить логику для отображения валюты
    };

    return (
        <div>
            <div className="currency-selector">
                <button onClick={() => handleCurrencyChange('RUB')}>RUB</button>
                <button onClick={() => handleCurrencyChange('USD')}>USD</button>
                <button onClick={() => handleCurrencyChange('EUR')}>EUR</button>
            </div>
            <div className="balance-display">
                {getDisplayedBalance()}
            </div>
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

function App() {
    const [balance, setBalance] = useState(1000);
    const [isBalanceVisible, setIsBalanceVisible] = useState(true);
    const [currency, setCurrency] = useState('RUB');
    const [theme, setTheme] = useState('light'); // Состояние для темы
    const [timezone, setTimezone] = useState('UTC'); // Состояние для часового пояса

    const toggleBalanceVisibility = () => {
        setIsBalanceVisible(!isBalanceVisible);
    };

    const handleCurrencyChange = (newCurrency) => {
        setCurrency(newCurrency);
        // Здесь можно добавить логику для обновления баланса в зависимости от выбранной валюты
    };

    useEffect(() => {
        tg.ready();
        document.body.className = theme; // Устанавливаем класс на body для применения стилей
    }, [theme]);

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
                    {/* Заменили Route с exact на просто Route */}
                    <Routes>
                        {/* Используем обновленный компонент Home */}
                        <Route path="/" element={<Home balance={balance} toggleBalanceVisibility={toggleBalanceVisibility} isBalanceVisible={isBalanceVisible} handleCurrencyChange={handleCurrencyChange} />} />
                        {/* Используем обновленный компонент QuickExchange */}
                        <Route path="/quick-exchange" element={<QuickExchange />} />
                        {/* Передаем пропсы в Settings */}
                        <Route path="/settings" element={<Settings theme={theme} setTheme={setTheme} timezone={timezone} setTimezone={setTimezone} />} />
                        {/* Используем обновленный компонент MyOrders */}
                        <Route path="/my-orders" element={<MyOrders />} />
                    </Routes>
                </div>

            </div>

        </Router >
    );
}

export default App;