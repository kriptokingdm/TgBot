import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import axios from 'axios'; // Импортируем Axios
import './App.css';
import QuickExchange from './QuickExchange'; // Импортируем компонент QuickExchange
import Settings from './Settings'; // Импортируем компонент Settings

function Home() {
    const [isUsdtOnTop, setIsUsdtOnTop] = useState(true);
    const [amount, setAmount] = useState(0);
    const [exchangeRate, setExchangeRate] = useState(75); // Начальное значение курса
    const apiKey = 'YOUR_API_KEY'; // Замените на ваш API-ключ

    useEffect(() => {
        const fetchExchangeRate = async () => {
            try {
                const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/USD`); // Пример запроса к API
                setExchangeRate(response.data.rates.RUB); // Устанавливаем курс RUB к USD
            } catch (error) {
                console.error("Ошибка при получении курса:", error);
            }
        };

        fetchExchangeRate();
    }, []);

    const toggleCurrencies = () => {
        setIsUsdtOnTop(!isUsdtOnTop);
        setAmount(0); // Сбрасываем сумму при переключении валют
    };

    const handleAmountChange = (e) => {
        setAmount(e.target.value);
    };

    // Обновленная логика конвертации
    const convertedAmount = isUsdtOnTop ? amount * exchangeRate : amount / exchangeRate;

    return (
        <div className="home-container">
            <div className="info-box">
                <div className="labels">
                    <div className="currency-label">
                        <h2>Продаете</h2>
                        <h3>{isUsdtOnTop ? 'USDT' : 'RUB'}</h3>
                    </div>
                    <div className="arrow" onClick={toggleCurrencies} style={{ cursor: 'pointer', fontSize: '24px' }}>
                        🡺
                    </div>
                    <div className="currency-label">
                        <h2>Покупаете</h2>
                        <h3>{isUsdtOnTop ? 'RUB' : 'USDT'}</h3>
                    </div>
                </div>

                {/* Сплошная линия */}
                <hr style={{ margin: '20px 0', border: '1px solid #ccc' }} />

                {/* Поле ввода суммы и результат конверсии в одной строке */}
                <div className="input-result-container">
                    <div className="input-container">
                        <input 
                            type="number" 
                            placeholder={isUsdtOnTop ? "Сумма в $" : "Сумма в ₽"} 
                            value={amount} 
                            onChange={handleAmountChange} 
                        />
                        <span>{isUsdtOnTop ? "$" : "₽"}</span>
                    </div>

                    {/* Отображение конвертированной суммы с анимацией */}
                    <div className="conversion-result">
                        <span style={{ fontSize: '20px', lineHeight: '1.5' }}>
                            {isUsdtOnTop 
                                ? `Вы получите: ${convertedAmount.toFixed(2)} ₽` 
                                : `Вы получите: ${convertedAmount.toFixed(2)} $`}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function App() {
    return (
        <Router>
            <div className="App">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/quick-exchange" element={<QuickExchange />} />
                    <Route path="/settings" element={<Settings />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;