// src/Home.js
import React, { useState, useEffect } from 'react';
import './Home.css';
import SupportChat from './SupportChat';

function Home({ navigateTo }) {
    const [isBuyMode, setIsBuyMode] = useState(true);
    const [isSwapped, setIsSwapped] = useState(false);
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');
    const [buyRate, setBuyRate] = useState(85.6);
    const [sellRate, setSellRate] = useState(81.6);
    const [currentTier, setCurrentTier] = useState('');

    // Состояния для чата
    const [showSupportChat, setShowSupportChat] = useState(false);
    const [currentOrderId, setCurrentOrderId] = useState(null);
    const [currentExchangeData, setCurrentExchangeData] = useState(null);

    // Состояния для активных ордеров
    const [hasActiveOrder, setHasActiveOrder] = useState(false);
    const [activeOrdersCount, setActiveOrdersCount] = useState(0);

    // Лимиты
    const MIN_RUB = 1000;
    const MAX_RUB = 1000000;
    const MIN_USDT = 10;
    const MAX_USDT = 10000;

    // Списки банков и сетей
    const availableBanks = [
        'Сбербанк', 'Т-Банк', 'ВТБ', 'Альфа-Банк', 'Газпромбанк', 'СовкомБанк',
        'Россельхоз', 'Райффайзен Банк', 'МТС Банк', 'Яндекс Деньги', 'Озон Банк',
        'ОТП Банк', 'Банк Уралсиб', 'СБП (Система быстрых платежей)'
    ];

    const availableNetworks = [
        { value: 'ERC20', name: 'ERC20 (Ethereum)', icon: '⛓️' },
        { value: 'TRC20', name: 'TRC20 (Tron)', icon: '⚡' },
        { value: 'TON', name: 'TON', icon: '💎' },
        { value: 'SOL', name: 'Solana', icon: '🔥' }
    ];

    // Состояния для реквизитов
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [showAddPayment, setShowAddPayment] = useState(false);
    const [newPayment, setNewPayment] = useState({
        bankName: '',
        cardNumber: '',
        phoneNumber: '',
        cardNumberError: ''
    });
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [showBankDropdown, setShowBankDropdown] = useState(false);

    const [cryptoAddresses, setCryptoAddresses] = useState([]);
    const [showAddCrypto, setShowAddCrypto] = useState(false);
    const [newCryptoAddress, setNewCryptoAddress] = useState({
        address: '',
        network: 'ERC20',
        name: '',
        addressError: ''
    });
    const [selectedCryptoAddress, setSelectedCryptoAddress] = useState(null);

    // Функция для расчета конвертированной суммы
    const calculateConvertedAmount = () => {
        if (!amount) return '';
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount)) return '';

        if (isBuyMode) {
            return (numAmount / buyRate).toFixed(2);
        } else {
            return (numAmount * sellRate).toFixed(2);
        }
    };

    const convertedAmount = calculateConvertedAmount();

    // Загрузка сохраненных данных
    useEffect(() => {
        const savedPayments = localStorage.getItem('userPaymentMethods');
        if (savedPayments) {
            try {
                setPaymentMethods(JSON.parse(savedPayments));
            } catch (error) {
                console.error('Ошибка загрузки реквизитов:', error);
            }
        }

        const savedCryptoAddresses = localStorage.getItem('userCryptoAddresses');
        if (savedCryptoAddresses) {
            try {
                setCryptoAddresses(JSON.parse(savedCryptoAddresses));
            } catch (error) {
                console.error('Ошибка загрузки адресов:', error);
            }
        }

        const savedSelected = localStorage.getItem('selectedPaymentMethod');
        if (savedSelected) {
            setSelectedPayment(JSON.parse(savedSelected));
        }

        const savedSelectedCrypto = localStorage.getItem('selectedCryptoAddress');
        if (savedSelectedCrypto) {
            setSelectedCryptoAddress(JSON.parse(savedSelectedCrypto));
        }
    }, []);

    // Загрузка курсов и проверка активных ордеров
    useEffect(() => {
        checkActiveOrders();
        fetchExchangeRates();

        // Глобальная функция для обновления из других компонентов
        window.updateActiveOrders = checkActiveOrders;

        return () => {
            window.updateActiveOrders = null;
        };
    }, []);

    // Функция проверки активных ордеров
    const checkActiveOrders = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.log('❌ Токен не найден');
                return;
            }

            console.log('🔍 Проверяем активные ордеры...');
            
            const response = await fetch('https://tgbot-l516.onrender.com/api/user/orders', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('📡 Статус ответа:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('📦 Данные ордеров:', data);
                
                const activeOrders = data.orders.filter(order =>
                    order.status === 'pending' || order.status === 'paid' || order.status === 'processing'
                );

                console.log('🔥 Активных ордеров:', activeOrders.length);
                console.log('📋 Все ордеры:', data.orders.map(o => ({id: o.id, status: o.status})));

                setActiveOrdersCount(activeOrders.length);
                setHasActiveOrder(activeOrders.length > 0);

            } else {
                console.error('❌ Ошибка ответа:', response.status);
            }
        } catch (error) {
            console.error('❌ Ошибка проверки активных ордеров:', error);
        }
    };

    // Проверяем активные ордеры каждые 30 секунд
    useEffect(() => {
        const interval = setInterval(() => {
            checkActiveOrders();
        }, 30000);

        return () => {
            clearInterval(interval);
        };
    }, []);

    // Загрузка курсов с бекенда
    const fetchExchangeRates = async () => {
        try {
            let requestAmount;
            if (amount) {
                requestAmount = parseFloat(amount);
            } else {
                requestAmount = 100;
            }

            if (requestAmount < MIN_USDT) {
                requestAmount = MIN_USDT;
            }

            const response = await fetch(`https://tgbot-l516.onrender.com${endpoint}`);
            const data = await response.json();
            console.log('📊 Курсы с бекенда:', data);

            setBuyRate(data.buy);
            setSellRate(data.sell);
            setCurrentTier(data.tier);

        } catch (error) {
            console.error('❌ Ошибка загрузки курсов:', error);
            setBuyRate(92.0);
            setSellRate(87.0);
        }
    };

    useEffect(() => {
        if (amount) {
            fetchExchangeRates();
        }
    }, [amount]);

    const handleSwap = () => {
        setIsSwapped(!isSwapped);
        setIsBuyMode(!isBuyMode);
        setAmount('');
        setError('');
        fetchExchangeRates();
    };

    const handleAmountChange = (e) => {
        const value = e.target.value;
        setAmount(value);

        if (value) {
            const numAmount = parseFloat(value);
            if (!isNaN(numAmount)) {
                if (isBuyMode) {
                    if (numAmount < MIN_RUB) {
                        setError(`Минимальная сумма: ${MIN_RUB.toLocaleString()} RUB`);
                    } else if (numAmount > MAX_RUB) {
                        setError(`Максимальная сумма: ${MAX_RUB.toLocaleString()} RUB`);
                    } else {
                        setError('');
                    }
                } else {
                    if (numAmount < MIN_USDT) {
                        setError(`Минимальная сумма: ${MIN_USDT} USDT`);
                    } else if (numAmount > MAX_USDT) {
                        setError(`Максимальная сумма: ${MAX_USDT} USDT`);
                    } else {
                        setError('');
                    }
                }
            }
        } else {
            setError('');
        }
    };

    const getCurrentRateForDisplay = () => {
        return isBuyMode ? buyRate : sellRate;
    };

    const formatRate = (rate) => {
        return rate.toFixed(2);
    };

    // Функции для работы с реквизитами
    const handleAddPayment = () => {
        if (!newPayment.bankName.trim()) {
            setNewPayment(prev => ({ ...prev, cardNumberError: 'Выберите банк' }));
            return;
        }

        // Для СБП проверяем номер телефона
        if (newPayment.bankName === 'СБП (Система быстрых платежей)') {
            if (!newPayment.phoneNumber.trim()) {
                setNewPayment(prev => ({ ...prev, cardNumberError: 'Введите номер телефона для СБП' }));
                return;
            }
            
            const newPaymentMethod = {
                id: Date.now(),
                name: newPayment.bankName,
                number: newPayment.phoneNumber,
                fullNumber: newPayment.phoneNumber,
                isUserAdded: true,
                type: 'sbp'
            };

            setPaymentMethods(prev => [...prev, newPaymentMethod]);
            setSelectedPayment(newPaymentMethod);
            
        } else {
            // Обычная карта
            const cleanedCardNumber = newPayment.cardNumber.replace(/\s/g, '');
            if (!/^\d+$/.test(cleanedCardNumber)) {
                setNewPayment(prev => ({ ...prev, cardNumberError: 'Номер карты должен содержать только цифры' }));
                return;
            }

            if (cleanedCardNumber.length < 16) {
                setNewPayment(prev => ({ ...prev, cardNumberError: 'Номер карты должен содержать 16 цифр' }));
                return;
            }

            const newPaymentMethod = {
                id: Date.now(),
                name: newPayment.bankName,
                number: cleanedCardNumber.slice(-4),
                fullNumber: cleanedCardNumber,
                isUserAdded: true,
                type: 'card'
            };

            setPaymentMethods(prev => [...prev, newPaymentMethod]);
            setSelectedPayment(newPaymentMethod);
        }

        setNewPayment({
            bankName: '',
            cardNumber: '',
            phoneNumber: '',
            cardNumberError: ''
        });
        setShowAddPayment(false);
        setShowBankDropdown(false);
    };

    const handleDeletePayment = (id, e) => {
        e.stopPropagation();
        setPaymentMethods(prev => prev.filter(payment => payment.id !== id));
        if (selectedPayment && selectedPayment.id === id) {
            setSelectedPayment(null);
        }
    };

    const handlePaymentSelect = (payment) => {
        setSelectedPayment(payment);
    };

    const handleBankSelect = (bank) => {
        setNewPayment(prev => ({ ...prev, bankName: bank }));
        setShowBankDropdown(false);
    };

    const formatCardNumber = (number) => {
        const cleaned = number.replace(/\s/g, '');
        return cleaned.replace(/(\d{4})(?=\d)/g, '$1 ').substr(0, 19);
    };

    const handleCardNumberChange = (e) => {
        const value = e.target.value.replace(/\D/g, '');
        const formatted = formatCardNumber(value);
        setNewPayment(prev => ({
            ...prev,
            cardNumber: formatted,
            cardNumberError: ''
        }));
    };

    const handlePhoneNumberChange = (e) => {
        const value = e.target.value.replace(/\D/g, '');
        let formatted = value;
        
        if (value.length <= 1) {
            formatted = value;
        } else if (value.length <= 4) {
            formatted = `+7 (${value.substring(1, 4)}`;
        } else if (value.length <= 7) {
            formatted = `+7 (${value.substring(1, 4)}) ${value.substring(4, 7)}`;
        } else if (value.length <= 9) {
            formatted = `+7 (${value.substring(1, 4)}) ${value.substring(4, 7)}-${value.substring(7, 9)}`;
        } else {
            formatted = `+7 (${value.substring(1, 4)}) ${value.substring(4, 7)}-${value.substring(7, 9)}-${value.substring(9, 11)}`;
        }
        
        setNewPayment(prev => ({
            ...prev,
            phoneNumber: formatted,
            cardNumberError: ''
        }));
    };

    // Функции для работы с крипто-адресами
    const handleAddCryptoAddress = () => {
        if (!newCryptoAddress.address.trim()) {
            setNewCryptoAddress(prev => ({ ...prev, addressError: 'Введите адрес кошелька' }));
            return;
        }

        if (!newCryptoAddress.name.trim()) {
            setNewCryptoAddress(prev => ({ ...prev, addressError: 'Введите название кошелька' }));
            return;
        }

        const newCrypto = {
            id: Date.now(),
            name: newCryptoAddress.name,
            address: newCryptoAddress.address,
            network: newCryptoAddress.network,
            isUserAdded: true
        };

        setCryptoAddresses(prev => [...prev, newCrypto]);
        setSelectedCryptoAddress(newCrypto);
        setNewCryptoAddress({
            address: '',
            network: 'ERC20',
            name: '',
            addressError: ''
        });
        setShowAddCrypto(false);
    };

    const handleDeleteCryptoAddress = (id, e) => {
        e.stopPropagation();
        setCryptoAddresses(prev => prev.filter(address => address.id !== id));
        if (selectedCryptoAddress && selectedCryptoAddress.id === id) {
            setSelectedCryptoAddress(null);
        }
    };

    const handleCryptoAddressSelect = (address) => {
        setSelectedCryptoAddress(address);
    };

    const copyToClipboard = (text, e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
            alert('Адрес скопирован в буфер обмена');
        });
    };

    // Проверка готовности к обмену
    const isExchangeReady = () => {
        if (hasActiveOrder) return false;

        if (!amount || error) return false;

        const numAmount = parseFloat(amount);
        if (isBuyMode) {
            if (numAmount < MIN_RUB || numAmount > MAX_RUB) return false;
        } else {
            if (numAmount < MIN_USDT || numAmount > MAX_USDT) return false;
        }

        if (isBuyMode) {
            return !!selectedCryptoAddress;
        } else {
            return !!selectedPayment;
        }
    };

    // Обработчик обмена
    const handleExchange = async () => {
        if (hasActiveOrder) {
            alert('❌ У вас уже есть активный ордер! Завершите текущую операцию перед созданием новой.');
            navigateTo('history');
            return;
        }

        if (!isExchangeReady()) return;

        try {
            const userData = JSON.parse(localStorage.getItem('currentUser'));
            console.log('👤 Данные пользователя из localStorage:', userData);
            
            if (!userData || !userData.id) {
                alert('❌ Ошибка: пользователь не авторизован');
                return;
            }

            const exchangeData = {
                type: isBuyMode ? 'buy' : 'sell',
                amount: parseFloat(amount),
                rate: isBuyMode ? buyRate : sellRate,
                userId: userData.id,
                paymentMethod: isBuyMode ? null : selectedPayment,
                cryptoAddress: isBuyMode ? selectedCryptoAddress : null
            };

            console.log('🔄 Создание заявки - данные:', exchangeData);

            const response = await fetch('https://tgbot-l516.onrender.com/api/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(exchangeData)
            });

            console.log('📡 Ответ сервера:', response.status, response.statusText);

            const result = await response.json();
            console.log('📦 Данные ответа:', result);

            if (result.success) {
                console.log('✅ Заявка создана:', result.order);

                setHasActiveOrder(true);
                setActiveOrdersCount(prev => prev + 1);

                setCurrentOrderId(result.order.id);
                setCurrentExchangeData({
                    type: exchangeData.type,
                    amount: exchangeData.amount,
                    rate: exchangeData.rate,
                    convertedAmount: calculateConvertedAmount()
                });

                setShowSupportChat(true);
                
                alert('✅ Заявка создана успешно! Открыт чат с поддержкой.');
                
            } else {
                console.error('❌ Ошибка при создании заявки:', result.error);
                alert(`❌ Ошибка при создании заявки: ${result.error}`);
            }

        } catch (error) {
            console.error('❌ Ошибка обмена:', error);
            alert('❌ Ошибка при выполнении обмена. Проверьте подключение к серверу.');
        }
    };

    // Сохранение данных
    useEffect(() => {
        localStorage.setItem('userPaymentMethods', JSON.stringify(paymentMethods));
    }, [paymentMethods]);

    useEffect(() => {
        localStorage.setItem('userCryptoAddresses', JSON.stringify(cryptoAddresses));
    }, [cryptoAddresses]);

    useEffect(() => {
        if (selectedPayment) {
            localStorage.setItem('selectedPaymentMethod', JSON.stringify(selectedPayment));
        }
    }, [selectedPayment]);

    useEffect(() => {
        if (selectedCryptoAddress) {
            localStorage.setItem('selectedCryptoAddress', JSON.stringify(selectedCryptoAddress));
        }
    }, [selectedCryptoAddress]);

    return (
        <div className="home-container">
            {/* Баннер активного ордера */}
            {hasActiveOrder && (
                <div className="active-order-warning">
                    <div className="warning-content">
                        <div className="warning-icon">⏳</div>
                        <div className="warning-text">
                            <strong>У вас есть активная операция</strong>
                            <span>Завершите текущий обмен перед созданием нового</span>
                        </div>
                        <button
                            className="warning-button"
                            onClick={() => navigateTo('history')}
                        >
                            Перейти к операции
                        </button>
                    </div>
                </div>
            )}

            {/* Переключатель Покупка/Продажа */}
            <div className="mode-switcher">
                <button
                    className={`mode-button buy ${isBuyMode ? 'active' : ''}`}
                    onClick={() => {
                        setIsBuyMode(true);
                        setIsSwapped(false);
                        setAmount('');
                        setError('');
                        fetchExchangeRates();
                    }}
                >
                    Покупка
                </button>
                <button
                    className={`mode-button sell ${!isBuyMode ? 'active' : ''}`}
                    onClick={() => {
                        setIsBuyMode(false);
                        setIsSwapped(true);
                        setAmount('');
                        setError('');
                        fetchExchangeRates();
                    }}
                >
                    Продажа
                </button>
            </div>

            {/* Основная форма обмена */}
            <div className={hasActiveOrder ? 'form-disabled' : ''}>
                {/* Блок с карточками валют */}
                <div className="currency-cards-horizontal">
                    <div className="currency-card-side left-card">
                        <div className="currency-content">
                            <span className="currency-name">
                                {isBuyMode ? "RUB" : "USDT"}
                            </span>
                            {isBuyMode && (
                                <span className="currency-rate light">
                                    {formatRate(getCurrentRateForDisplay())} ₽
                                </span>
                            )}
                        </div>
                    </div>

                    <button
                        className={`swap-center-button ${isSwapped ? 'swapped' : ''}`}
                        onClick={handleSwap}
                    >
                        <svg width="58" height="58" viewBox="0 0 58 58" fill="none">
                            <circle cx="29" cy="29" r="26.5" fill="#007CFF" stroke="#EFEFF3" strokeWidth="5" />
                            <path d="M37.3333 17.5423C40.8689 20.1182 43.1666 24.2907 43.1666 29C43.1666 36.824 36.824 43.1666 29 43.1666H28.1666M20.6666 40.4576C17.1311 37.8817 14.8333 33.7092 14.8333 29C14.8333 21.1759 21.1759 14.8333 29 14.8333H29.8333M30.6666 46.3333L27.3333 43L30.6666 39.6666M27.3333 18.3333L30.6666 15L27.3333 11.6666" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>

                    <div className="currency-card-side right-card">
                        <div className="currency-content">
                            <span className="currency-name">
                                {isBuyMode ? "USDT" : "RUB"}
                            </span>
                            {!isBuyMode && (
                                <span className="currency-rate light">
                                    {formatRate(getCurrentRateForDisplay())} ₽
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Поля ввода суммы */}
                <div className="amount-input-section">
                    <div className="amount-input-group">
                        <label className="amount-label">Вы отдаете</label>
                        <div className="amount-input-wrapper">
                            <input
                                type="number"
                                placeholder="0"
                                value={amount}
                                onChange={handleAmountChange}
                                className="amount-input"
                            />
                            <span className="amount-currency">
                                {isBuyMode ? "RUB" : "USDT"}
                            </span>
                        </div>
                        <div className="min-limit-hint">
                            Лимиты: {isBuyMode 
                                ? `${MIN_RUB.toLocaleString()} - ${MAX_RUB.toLocaleString()} RUB`
                                : `${MIN_USDT} - ${MAX_USDT} USDT`
                            }
                        </div>
                        {error && <div className="error-message">{error}</div>}
                    </div>

                    <div className="amount-input-group">
                        <label className="amount-label">Вы получаете</label>
                        <div className="amount-input-wrapper">
                            <input
                                type="text"
                                placeholder="0"
                                value={convertedAmount}
                                readOnly
                                className="amount-input"
                            />
                            <span className="amount-currency">
                                {isBuyMode ? "USDT" : "RUB"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Банковские реквизиты для ПРОДАЖИ USDT */}
                {!isBuyMode && (
                    <div className="payment-section">
                        <div className="payment-header">
                            <h3>Банковские реквизиты для получения RUB</h3>
                            {!showAddPayment && (
                                <button
                                    className="add-payment-button"
                                    onClick={() => setShowAddPayment(true)}
                                >
                                    + Добавить реквизиты
                                </button>
                            )}
                        </div>

                        {showAddPayment && (
                            <div className="add-payment-form">
                                <div className="form-header">
                                    <h4>Добавить реквизиты</h4>
                                    <button
                                        className="close-form"
                                        onClick={() => {
                                            setShowAddPayment(false);
                                            setShowBankDropdown(false);
                                            setNewPayment({
                                                bankName: '',
                                                cardNumber: '',
                                                phoneNumber: '',
                                                cardNumberError: ''
                                            });
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div className="form-input-group">
                                    <label className="input-label">Банк</label>
                                    <div className="bank-select-container">
                                        <div
                                            className={`bank-select ${newPayment.bankName ? 'has-value' : ''}`}
                                            onClick={() => setShowBankDropdown(!showBankDropdown)}
                                        >
                                            {newPayment.bankName || 'Выберите банк'}
                                            <span className="dropdown-arrow">▼</span>
                                        </div>

                                        {showBankDropdown && (
                                            <div className="bank-dropdown">
                                                {availableBanks.map((bank, index) => (
                                                    <div
                                                        key={index}
                                                        className="bank-option"
                                                        onClick={() => handleBankSelect(bank)}
                                                    >
                                                        {bank}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {newPayment.bankName === 'СБП (Система быстрых платежей)' ? (
                                    <div className="form-input-group">
                                        <label className="input-label">Номер телефона для СБП</label>
                                        <input
                                            type="tel"
                                            placeholder="+7 (900) 123-45-67"
                                            value={newPayment.phoneNumber}
                                            onChange={handlePhoneNumberChange}
                                            className={`payment-input ${newPayment.cardNumberError ? 'error' : ''}`}
                                            maxLength="18"
                                        />
                                        {newPayment.cardNumberError && (
                                            <div className="input-error">{newPayment.cardNumberError}</div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="form-input-group">
                                        <label className="input-label">Номер карты</label>
                                        <input
                                            type="text"
                                            placeholder="0000 0000 0000 0000"
                                            value={newPayment.cardNumber}
                                            onChange={handleCardNumberChange}
                                            className={`payment-input ${newPayment.cardNumberError ? 'error' : ''}`}
                                            maxLength="19"
                                        />
                                        {newPayment.cardNumberError && (
                                            <div className="input-error">{newPayment.cardNumberError}</div>
                                        )}
                                    </div>
                                )}

                                <button
                                    className="save-payment-button"
                                    onClick={handleAddPayment}
                                    disabled={
                                        !newPayment.bankName || 
                                        (newPayment.bankName === 'СБП (Система быстрых платежей)' 
                                            ? !newPayment.phoneNumber 
                                            : !newPayment.cardNumber.replace(/\s/g, '')
                                        )
                                    }
                                >
                                    Сохранить реквизиты
                                </button>
                            </div>
                        )}

                        <div className="payment-methods">
                            {paymentMethods.length === 0 ? (
                                <div className="no-payments-message">
                                    <div className="no-payments-icon">💳</div>
                                    <p>Добавьте банковские реквизиты для получения рублей</p>
                                </div>
                            ) : (
                                paymentMethods.map((payment) => (
                                    <div
                                        key={payment.id}
                                        className={`payment-method-item ${payment.type === 'sbp' ? 'sbp' : ''} ${selectedPayment?.id === payment.id ? 'selected' : ''}`}
                                        onClick={() => handlePaymentSelect(payment)}
                                    >
                                        <div className="payment-info">
                                            <div className="payment-header-info">
                                                <span className="payment-name">{payment.name}</span>
                                                {payment.type === 'sbp' && (
                                                    <span className="sbp-badge">СБП</span>
                                                )}
                                            </div>
                                            <span className="payment-number">
                                                {payment.type === 'sbp' ? '📱 ' + payment.number : '💳 •••• ' + payment.number}
                                            </span>
                                        </div>
                                        <button
                                            className="delete-payment"
                                            onClick={(e) => handleDeletePayment(payment.id, e)}
                                            title="Удалить реквизиты"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Крипто-адреса для ПОКУПКИ USDT */}
                {isBuyMode && (
                    <div className="payment-section">
                        <div className="payment-header">
                            <h3>Адрес для получения USDT</h3>
                            {!showAddCrypto && (
                                <button
                                    className="add-payment-button"
                                    onClick={() => setShowAddCrypto(true)}
                                >
                                    + Добавить адрес
                                </button>
                            )}
                        </div>

                        {showAddCrypto && (
                            <div className="add-payment-form">
                                <div className="form-header">
                                    <h4>Добавить адрес USDT</h4>
                                    <button
                                        className="close-form"
                                        onClick={() => {
                                            setShowAddCrypto(false);
                                            setNewCryptoAddress({
                                                address: '',
                                                network: 'ERC20',
                                                name: '',
                                                addressError: ''
                                            });
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div className="form-input-group">
                                    <label className="input-label">Название кошелька</label>
                                    <input
                                        type="text"
                                        placeholder="Например: Мой основной кошелек"
                                        value={newCryptoAddress.name}
                                        onChange={(e) => setNewCryptoAddress(prev => ({
                                            ...prev,
                                            name: e.target.value,
                                            addressError: ''
                                        }))}
                                        className="payment-input"
                                    />
                                </div>

                                <div className="form-input-group">
                                    <label className="input-label">Сеть</label>
                                    <div className="network-select-container">
                                        <select
                                            value={newCryptoAddress.network}
                                            onChange={(e) => setNewCryptoAddress(prev => ({
                                                ...prev,
                                                network: e.target.value,
                                                addressError: ''
                                            }))}
                                            className="network-select"
                                        >
                                            {availableNetworks.map(network => (
                                                <option key={network.value} value={network.value}>
                                                    {network.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="form-input-group">
                                    <label className="input-label">Адрес кошелька {newCryptoAddress.network}</label>
                                    <input
                                        type="text"
                                        placeholder={`Введите адрес кошелька ${newCryptoAddress.network}`}
                                        value={newCryptoAddress.address}
                                        onChange={(e) => setNewCryptoAddress(prev => ({
                                            ...prev,
                                            address: e.target.value,
                                            addressError: ''
                                        }))}
                                        className={`payment-input ${newCryptoAddress.addressError ? 'error' : ''}`}
                                    />
                                    {newCryptoAddress.addressError && (
                                        <div className="input-error">{newCryptoAddress.addressError}</div>
                                    )}
                                </div>

                                <button
                                    className="save-payment-button"
                                    onClick={handleAddCryptoAddress}
                                    disabled={!newCryptoAddress.address || !newCryptoAddress.name}
                                >
                                    Сохранить адрес
                                </button>
                            </div>
                        )}

                        <div className="payment-methods">
                            {cryptoAddresses.length === 0 ? (
                                <div className="no-payments-message">
                                    <div className="no-payments-icon">₿</div>
                                    <p>Добавьте адрес кошелька для получения USDT</p>
                                </div>
                            ) : (
                                cryptoAddresses.map((address) => {
                                    const networkInfo = availableNetworks.find(net => net.value === address.network);
                                    return (
                                        <div
                                            key={address.id}
                                            className={`payment-method-item ${selectedCryptoAddress?.id === address.id ? 'selected' : ''}`}
                                            onClick={() => handleCryptoAddressSelect(address)}
                                        >
                                            <div className="payment-info">
                                                <div className="crypto-header">
                                                    <span className="payment-name">{address.name}</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <span>{networkInfo?.icon}</span>
                                                        <span className="crypto-network">{address.network}</span>
                                                    </div>
                                                </div>
                                                <div className="crypto-address">
                                                    {address.address.slice(0, 8)}...{address.address.slice(-8)}
                                                    <button
                                                        className="copy-address"
                                                        onClick={(e) => copyToClipboard(address.address, e)}
                                                        title="Скопировать адрес"
                                                    >
                                                        📋
                                                    </button>
                                                </div>
                                            </div>
                                            <button
                                                className="delete-payment"
                                                onClick={(e) => handleDeleteCryptoAddress(address.id, e)}
                                                title="Удалить адрес"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Кнопка обмена */}
            <button
                className={`exchange-button ${isBuyMode ? 'buy' : 'sell'} ${!isExchangeReady() ? 'disabled' : ''}`}
                disabled={!isExchangeReady()}
                onClick={handleExchange}
            >
                {hasActiveOrder ? '❌ Завершите текущий ордер' : (isBuyMode ? 'Купить USDT' : 'Продать USDT')}
            </button>

            {/* Чат поддержки */}
            {showSupportChat && (
                <SupportChat
                    orderId={currentOrderId}
                    onClose={() => setShowSupportChat(false)}
                    exchangeData={currentExchangeData}
                />
            )}

            {/* Нижнее меню */}
            <div className="bottom-nav">
                <button className="nav-button active" onClick={() => navigateTo('home')}>
                    <span>🏠</span>
                    <span>Обмен</span>
                </button>

                <button className="nav-button" onClick={() => navigateTo('profile')}>
                    <span>👤</span>
                    <span>Профиль</span>
                </button>

                <button className="nav-button" onClick={() => navigateTo('history')}>
                    <span>📊</span>
                    <span>История</span>
                </button>

                <button className="nav-button" onClick={() => navigateTo('help')}>
                    <span>❓</span>
                    <span>Справка</span>
                </button>
            </div>
        </div>
    );
}

export default Home;

