import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function Home() {
    const [isUsdtOnTop, setIsUsdtOnTop] = useState(true);
    const [amount, setAmount] = useState(0);
    const [exchangeRate, setExchangeRate] = useState(75);
    const [isRotated, setIsRotated] = useState(false);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [newPaymentMethod, setNewPaymentMethod] = useState("");
    const [isAddingPaymentMethod, setIsAddingPaymentMethod] = useState(false);

    useEffect(() => {
        // Получение информации о теме из Telegram Web App
        if (window.Telegram && window.Telegram.WebApp) {
            const themeParams = window.Telegram.WebApp.themeParams;

            // Устанавливаем тему на основе параметров
            if (themeParams) {
                document.documentElement.style.setProperty('--bg-color', themeParams.bg_color || '#1e1e1e');
                document.documentElement.style.setProperty('--text-color', themeParams.text_color || 'white');
            }
        }

        // Получение курса обмена
        const fetchExchangeRate = async () => {
            try {
                const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/USD`);
                setExchangeRate(response.data.rates.RUB);
            } catch (error) {
                console.error("Ошибка при получении курса:", error);
            }
        };

        fetchExchangeRate();
    }, []);

    const toggleCurrencies = (event) => {
        event.preventDefault(); // Предотвращаем любые нежелательные действия по умолчанию
        setIsRotated(!isRotated); // Переключаем состояние вращения
    };

    const handleAmountChange = (e) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value)) {
            setAmount(value);
        } else {
            setAmount(0);
        }
    };

    const convertedAmount = isUsdtOnTop ? amount * exchangeRate : amount / exchangeRate;

    const handleAddPaymentMethod = (e) => {
        e.preventDefault();
        if (newPaymentMethod.trim() !== "") {
            setPaymentMethods([...paymentMethods, newPaymentMethod]);
            setNewPaymentMethod("");
            setIsAddingPaymentMethod(false);
        }
    };

    return (
        <div className="home-container">
            {/* Кнопки покупки и продажи */}
            <div className="button-container">
                <div className="label-box buy" onClick={() => setIsUsdtOnTop(true)}>Покупка</div>
                <div className="label-box sell" onClick={() => setIsUsdtOnTop(false)}>Продажа</div>
            </div>

            <div className="currency-container">
                <div className="currency-box">
                    <h3 className='size-valute'>{isUsdtOnTop ? "USDT" : "RUB"}</h3>
                    <div className="input-container">
                        <input
                            type="number"
                            placeholder={isUsdtOnTop ? "Сумма в $" : "Сумма в ₽"}
                            value={isUsdtOnTop ? amount : convertedAmount.toFixed(2)}
                            onChange={handleAmountChange}
                        />
                        <span style={{ position: 'absolute', right: '10%', top: '25%' }}>
                            {isUsdtOnTop ? "$" : "₽"}
                        </span>
                    </div>
                </div>

                {/* Иконка смены валют с анимацией */}
                <span className={`icon-overlay ${isRotated ? 'rotate' : ''}`} onClick={toggleCurrencies}>
                    {/* Ваш SVG код */}
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="32" cy="32" r="28" fill="#3179F5" stroke="#232323" strokeWidth="8" />
                        <path d="M32 19.9997V23.5797C32 24.4797 33.08 24.9197 33.7 24.2797L39.28 18.6997C39.68 18.2997 ... (остальной код) ..." fill="white" />
                    </svg>
                </span>

                <div className="currency-box">
                    <h3>{isUsdtOnTop ? "RUB" : "USDT"}</h3>
                    <div className="input-container">
                        <input
                            type="number"
                            placeholder={isUsdtOnTop ? "Сумма в ₽" : "Сумма в $"}
                            value={isUsdtOnTop ? convertedAmount.toFixed(2) : amount}
                            readOnly
                        />
                        <span style={{ position: 'absolute', right: '10%', top: '25%' }}>
                            {isUsdtOnTop ? "₽" : "$"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Способы оплаты */}
            <select className="payment-method">
                <option value="">Способ оплаты</option>
                {paymentMethods.map((method, index) => (
                    <option key={index} value={method}>{method}</option>
                ))}
            </select>

            {/* Кнопка для добавления нового способа оплаты */}
            <div className="payment-method-container">
                <button
                    onClick={() => setIsAddingPaymentMethod(!isAddingPaymentMethod)}
                    style={{ width: '100%', padding: '10px', textAlign: 'left' }}
                >
                    {isAddingPaymentMethod ? '-' : '+'} Добавить способ оплаты
                </button>

                {isAddingPaymentMethod && (
                    <form onSubmit={handleAddPaymentMethod}>
                        <input
                            type="text"
                            placeholder="Введите новый способ оплаты"
                            value={newPaymentMethod}
                            onChange={(e) => setNewPaymentMethod(e.target.value)}
                        />
                        <button type="submit">Добавить</button>
                    </form>
                )}
            </div>

            {/* Новый контейнер с кнопками */}
            <div className="button-container-bottom">
                {/* Кнопка 1 */}
                <button onClick={() => console.log("Переключение на страницу 1")}>
                    {/* Ваш SVG код для кнопки 1 */}
                    ...
                </button>

                {/* Кнопка 2 */}
                <button onClick={() => console.log("Переключение на страницу 2")}>
                    {/* Ваш SVG код для кнопки 2 */}
                    ...
                </button>

                {/* Кнопка для переключения на страницу с заглушкой */}
                <button onClick={() => console.log("Переключение на страницу с заглушкой")}>
                    {/* Ваш SVG код для кнопки с заглушкой */}
                    ...
                </button>

                {/* Кнопка для функции */}
                <button onClick={() => console.log("Переключение на страницу с функцией")}>
                    {/* Ваш контент для кнопки функции */}
                    ...
                </button>
            </div>
        </div>
    );
}

export default Home;