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

    const toggleCurrencies = () => {
        setIsRotated(true);
        setIsUsdtOnTop(!isUsdtOnTop);

        setTimeout(() => {
            setIsRotated(false);
        }, 500);
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

            {/* Контейнеры для USDT и RUB */}
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

                {/* Ваш SVG для смены валют с анимацией */}
                <span className={`icon-overlay ${isRotated ? 'rotate' : ''}`} onClick={toggleCurrencies}>
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="32" cy="32" r="28" fill="#3179F5" stroke="#232323" stroke-width="8" />
                        <path d="M32 19.9997V23.5797C32 24.4797 33.08 24.9197 33.7 24.2797L39.28 18.6997C39.68 18.2997 39.68 17.6797 39.28 17.2797L33.7 11.6997C33.08 11.0797 32 11.5197 32 12.4197V15.9997C23.16 15.9997 16 23.1597 16 31.9997C16 34.0797 16.4 36.0797 17.14 37.8997C17.68 39.2397 19.4 39.5997 20.42 38.5797C20.96 38.0397 21.18 37.2197 20.88 36.4997C20.3 35.1197 20 33.5797 20 31.9997C20 25.3797 25.38 19.9997 32 19.9997ZM43.58 25.4197C43.04 25.9597 42.82 26.7997 43.12 27.4997C43.68 28.8997 44 30.4197 44 31.9997C44 38.6197 38.62 43.9997 32 43.9997V40.4197C32 39.5197 30.92 39.0797 30.3 39.7197L24.72 45.2997C24.32 45.6997 24.32 46.3197 24.72 46.7197L30.3 52.2997C30.92 52.9197 32 52.4797 32 51.5997V47.9997C40.84 47.9997 48 40.8397 48 31.9997C48 29.9197 47.6 27.9197 46.86 26.0997C46.32 24.7597 44.6 24.3997 43.58 25.4197Z" fill="white" />
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
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11.6667 14.1666C11.6667 18.75 15.4167 22.5 20 22.5C24.5833 22.5 28.3333 18.75 28.3333 14.1666V11.6666C28.3333 7.08331 24.5833 3.33331 20 3.33331C15.4167 3.33331 11.6667 7.08331 11.6667 11.6666V14.1666Z" fill="white" />
                        <path d="M3.33333 34C3.33333 35.4667 4.53333 36.6667 6 36.6667H33.9667C35.4333 36.6667 36.6333 35.4667 36.6333 34V26.25C36.6333 25.85 36.6333 25.4167 36.4333 25.2167C35.8167 23.7667 33.9333 22.5 31.0167 21.4667C28.95 25.4333 24.7667 28.1333 19.9833 28.1333C15.2 28.1333 11.0333 25.4333 8.95 21.4667C6.03333 22.5167 4.16667 23.75 3.53333 25.2167C3.33333 25.6167 3.33333 25.8333 3.33333 26.25V34Z" fill="white" />
                    </svg>

                </button>

                {/* Кнопка 2 */}
                <button onClick={() => console.log("Переключение на страницу 2")}>
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 9.99998V19.7397C20 19.8927 20.1041 20.026 20.2525 20.0631L26.6667 21.6666M36.6667 20C36.6667 29.2047 29.2048 36.6666 20 36.6666C10.7953 36.6666 3.33334 29.2047 3.33334 20C3.33334 10.7952 10.7953 3.33331 20 3.33331C29.2048 3.33331 36.6667 10.7952 36.6667 20Z" stroke="white" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>

                </button>

                {/* Кнопка для переключения на страницу с заглушкой */}
                <button onClick={() => console.log("Переключение на страницу с заглушкой")}>

                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M31.1833 16.6667H35.6667C37.1333 16.6667 38.3333 17.8667 38.3333 19.3334V20.6667C38.3333 22.1334 37.1333 23.3334 35.6667 23.3334H31.1833C30.95 24.1167 30.65 24.85 30.2667 25.55L33.4333 28.7167C34.4667 29.75 34.4667 31.45 33.4333 32.4834L32.4833 33.4333C31.45 34.4667 29.75 34.4667 28.7167 33.4333L25.55 30.2667C24.85 30.65 24.1167 30.95 23.3333 31.1833V35.6667C23.3333 37.1333 22.1333 38.3334 20.6667 38.3334H19.3333C17.8667 38.3334 16.6667 37.1333 16.6667 35.6667V31.1833C15.8833 30.95 15.15 30.65 14.45 30.2667L11.2833 33.4333C10.25 34.4667 8.54999 34.4667 7.51666 33.4333L6.56666 32.4834C5.53332 31.45 5.53332 29.75 6.56666 28.7167L9.73332 25.55C9.34999 24.85 9.04999 24.1167 8.81666 23.3334H4.33332C2.86666 23.3334 1.66666 22.1334 1.66666 20.6667V19.3334C1.66666 17.8667 2.86666 16.6667 4.33332 16.6667H8.81666C9.04999 15.8834 9.34999 15.15 9.73332 14.45L6.56666 11.2834C5.53332 10.25 5.53332 8.55002 6.56666 7.51669L7.51666 6.56669C8.54999 5.53335 10.25 5.53335 11.2833 6.56669L14.45 9.73335C15.15 9.35002 15.8833 9.05002 16.6667 8.81669V4.33335C16.6667 2.86669 17.8667 1.66669 19.3333 1.66669H20.6667C22.1333 1.66669 23.3333 2.86669 23.3333 4.33335V8.81669C24.1167 9.05002 24.85 9.35002 25.55 9.73335L28.7167 6.56669C29.75 5.53335 31.45 5.53335 32.4833 6.56669L33.4333 7.51669C34.4667 8.55002 34.4667 10.25 33.4333 11.2834L30.2667 14.45C30.65 15.15 30.95 15.8834 31.1833 16.6667ZM26.6667 20C26.6667 23.6819 23.6819 26.6667 20 26.6667C16.3181 26.6667 13.3333 23.6819 13.3333 20C13.3333 16.3181 16.3181 13.3334 20 13.3334C23.6819 13.3334 26.6667 16.3181 26.6667 20Z" fill="white" />
                    </svg>


                </button>

                {/* Кнопка для функции */}
                <button onClick={() => console.log("Переключение на страницу с функцией")}>

                    <h1>🥕</h1>
                </button>
            </div>
        </div>
    );
}

export default Home;