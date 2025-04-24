import React, { useState } from 'react';

function QuickExchange() {
    const [step, setStep] = useState(1);
    const [action, setAction] = useState('');
    const [currency, setCurrency] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleActionSelect = (selectedAction) => {
        setAction(selectedAction);
        setStep(2); // Переход к выбору валюты
    };

    const handleCurrencySelect = (selectedCurrency) => {
        setCurrency(selectedCurrency);
        setStep(3); // Переход к вводу суммы
    };

    const handleOrderSubmit = async () => {
        if (!amount || amount <= 0) {
            setErrorMessage('Сумма должна быть положительной');
            return;
        }

        setLoading(true);
        setErrorMessage('');

        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action,
                    currency,
                    amount,
                }),
            });

            if (!response.ok) throw new Error('Ошибка при создании ордера');

            console.log(`Создан ордер: ${action} ${amount} ${currency}`);
            
            // Сброс состояния после создания ордера
            setStep(1);
            setAction('');
            setCurrency('');
            setAmount('');
            
        } catch (error) {
            console.error(error);
            setErrorMessage('Произошла ошибка при создании ордера');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h2>Быстрый обмен</h2>
            {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
            {loading && <p>Создание ордера...</p>}
            
            {step === 1 && (
                <div>
                    <h3>Выберите действие</h3>
                    <button onClick={() => handleActionSelect('Купить')}>Купить</button>
                    <button onClick={() => handleActionSelect('Продать')}>Продать</button>
                </div>
            )}

            {step === 2 && (
                <div>
                    <h3>Выберите валюту</h3>
                    <button onClick={() => handleCurrencySelect('RUB')}>RUB</button>
                    <button onClick={() => handleCurrencySelect('USD')}>USD</button>
                    <button onClick={() => handleCurrencySelect('EUR')}>EUR</button>
                </div>
            )}

            {step === 3 && (
                <div>
                    <h3>Введите сумму</h3>
                    <input 
                        type="number" 
                        value={amount} 
                        onChange={(e) => setAmount(e.target.value)} 
                        placeholder="Сумма" 
                    />
                    <button onClick={handleOrderSubmit} disabled={loading}>
                        Создать ордер
                    </button>
                </div>
            )}
        </div>
    );
}

export default QuickExchange;