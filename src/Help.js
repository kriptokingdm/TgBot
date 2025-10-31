import React, { useState } from 'react';
import './Help.css';

function Help({ navigateTo }) {
    const [activeSection, setActiveSection] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchResults, setShowSearchResults] = useState(false);

    const toggleSection = (section) => {
        setActiveSection(activeSection === section ? null : section);
    };

    const handleSearch = (query) => {
        setSearchQuery(query);
        
        if (query.trim() === '') {
            setSearchResults([]);
            setShowSearchResults(false);
            return;
        }

        const lowerQuery = query.toLowerCase();
        const results = [];

        // Поиск по FAQ
        faqItems.forEach((item, index) => {
            if (item.question.toLowerCase().includes(lowerQuery) || 
                item.answer.toLowerCase().includes(lowerQuery)) {
                results.push({
                    type: 'faq',
                    title: item.question,
                    content: item.answer,
                    section: 'faq',
                    index
                });
            }
        });

        // Поиск по правилам
        rules.forEach((rule, index) => {
            if (rule.toLowerCase().includes(lowerQuery)) {
                results.push({
                    type: 'rule',
                    title: 'Правило обмена',
                    content: rule,
                    section: 'rules',
                    index
                });
            }
        });

        // Поиск по контактам
        contacts.forEach((contact, index) => {
            if (contact.type.toLowerCase().includes(lowerQuery) || 
                contact.value.toLowerCase().includes(lowerQuery)) {
                results.push({
                    type: 'contact',
                    title: contact.type,
                    content: contact.value,
                    section: 'contacts',
                    index
                });
            }
        });

        setSearchResults(results);
        setShowSearchResults(results.length > 0);
    };

    const handleResultClick = (result) => {
        setActiveSection(result.section);
        setSearchQuery('');
        setShowSearchResults(false);
        
        // Прокрутка к элементу (можно добавить позже)
        setTimeout(() => {
            const element = document.getElementById(`${result.section}-${result.index}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    };

    const popularQuestions = [
        "Как купить USDT?",
        "Сколько времени занимает обмен?",
        "Какие есть лимиты?",
        "Курс обмена",
        "Поддержка"
    ];

    const faqItems = [
        {
            id: 'faq-0',
            question: "Как происходит обмен?",
            answer: "Выберите направление обмена, введите сумму, выберите способ оплаты и нажмите кнопку 'Обмен'. Следуйте инструкциям для завершения операции."
        },
        {
            id: 'faq-1',
            question: "Сколько времени занимает обмен?",
            answer: "Обычно обмен занимает от 5 до 30 минут. Время зависит от загрузки сети и скорости обработки платежа банком."
        },
        {
            id: 'faq-2',
            question: "Какие есть лимиты?",
            answer: "Минимальная сумма: 3 USDT или 300 RUB. Максимальная сумма зависит от вашего уровня верификации."
        },
        {
            id: 'faq-3',
            question: "Почему курс отличается от биржевого?",
            answer: "Наш курс включает комиссию за обслуживание и обеспечивает мгновенную конвертацию без риска колебаний рынка."
        },
        {
            id: 'faq-4',
            question: "Что делать, если операция зависла?",
            answer: "Если операция не завершилась в течение 1 часа, свяжитесь с поддержкой и предоставьте ID операции."
        },
        {
            id: 'faq-5',
            question: "Какой курс обмена?",
            answer: "Курс рассчитывается на основе биржевых данных с учетом нашей комиссии. Точный курс вы увидите перед подтверждением операции."
        }
    ];

    const rules = [
        "Все операции проходят в соответствии с законодательством РФ",
        "Обмен производится только в личных целях",
        "Запрещены операции с целью отмывания денег",
        "Поддержка оставляет за собой право отклонить или приостановить подозрительные операции",
        "Курс фиксируется на момент создания заявки"
    ];

    const contacts = [
        { type: "Telegram", value: "@tetherbot_support", link: "https://t.me/tetherbot_support" },
        { type: "Email", value: "support@tetherbot.com", link: "mailto:support@tetherbot.com" },
        { type: "Время работы", value: "круглосуточно" }
    ];

    return (
        <div className="help-container">
            <div className="page-header">
                <h1>FAQ</h1>
                <p className="page-subtitle">Задайте вопрос или выберите тему</p>
            </div>
            
            <div className="help-content">
                {/* Поисковая строка с помощником */}
                <div className="assistant-search">
                    <div className="search-container">
                        <div className="search-icon">🔍</div>
                        <input
                            type="text"
                            placeholder="Спросите у кролика..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="search-input"
                        />
                        {searchQuery && (
                            <button 
                                className="clear-search"
                                onClick={() => {
                                    setSearchQuery('');
                                    setShowSearchResults(false);
                                }}
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Результаты поиска */}
                    {showSearchResults && (
                        <div className="search-results">
                            <div className="results-header">
                                <span>Найдено ответов: {searchResults.length}</span>
                            </div>
                            {searchResults.map((result, index) => (
                                <div
                                    key={index}
                                    className="search-result-item"
                                    onClick={() => handleResultClick(result)}
                                >
                                    <div className="result-type">{result.type === 'faq' ? '❓' : result.type === 'rule' ? '📋' : '📞'}</div>
                                    <div className="result-content">
                                        <div className="result-title">{result.title}</div>
                                        <div className="result-preview">{result.content}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Популярные вопросы */}
                    {!searchQuery && (
                        <div className="popular-questions">
                            <h3>Популярные вопросы</h3>
                            <div className="questions-grid">
                                {popularQuestions.map((question, index) => (
                                    <div
                                        key={index}
                                        className="question-chip"
                                        onClick={() => handleSearch(question)}
                                    >
                                        {question}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* FAQ секция */}
                <div className={`help-section ${activeSection === 'faq' ? 'active' : ''}`}>
                    <div className="section-header" onClick={() => toggleSection('faq')}>
                        <h3>📋 Часто задаваемые вопросы</h3>
                        <span className="toggle-icon">{activeSection === 'faq' ? '−' : '+'}</span>
                    </div>
                    {activeSection === 'faq' && (
                        <div className="section-content">
                            {faqItems.map((item, index) => (
                                <div key={index} id={item.id} className="faq-item">
                                    <div className="faq-question">
                                        <strong>Q:</strong> {item.question}
                                    </div>
                                    <div className="faq-answer">
                                        <strong>A:</strong> {item.answer}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Правила секция */}
                <div className={`help-section ${activeSection === 'rules' ? 'active' : ''}`}>
                    <div className="section-header" onClick={() => toggleSection('rules')}>
                        <h3>⚖️ Правила обмена</h3>
                        <span className="toggle-icon">{activeSection === 'rules' ? '−' : '+'}</span>
                    </div>
                    {activeSection === 'rules' && (
                        <div className="section-content">
                            <ul className="rules-list">
                                {rules.map((rule, index) => (
                                    <li key={index} id={`rules-${index}`} className="rule-item">
                                        {rule}
                                    </li>
                                ))}
                            </ul>
                            <div className="important-note">
                                <strong>Важно:</strong> Перед совершением операции убедитесь, что вы ознакомились с правилами.
                            </div>
                        </div>
                    )}
                </div>

                {/* Контакты секция */}
                <div className={`help-section ${activeSection === 'contacts' ? 'active' : ''}`}>
                    <div className="section-header" onClick={() => toggleSection('contacts')}>
                        <h3>📞 Контакты поддержки</h3>
                        <span className="toggle-icon">{activeSection === 'contacts' ? '−' : '+'}</span>
                    </div>
                    {activeSection === 'contacts' && (
                        <div className="section-content">
                            <div className="contacts-list">
                                {contacts.map((contact, index) => (
                                    <div key={index} id={`contacts-${index}`} className="contact-item">
                                        <span className="contact-type">{contact.type}:</span>
                                        {contact.link ? (
                                            <a 
                                                href={contact.link} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="contact-value"
                                            >
                                                {contact.value}
                                            </a>
                                        ) : (
                                            <span className="contact-value">{contact.value}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="response-time">
                                <strong>Среднее время ответа:</strong> до 15 минут
                            </div>
                        </div>
                    )}
                </div>

                {/* Инструкция по обмену */}
                <div className={`help-section ${activeSection === 'guide' ? 'active' : ''}`}>
                    <div className="section-header" onClick={() => toggleSection('guide')}>
                        <h3>🎯 Как пользоваться обменником</h3>
                        <span className="toggle-icon">{activeSection === 'guide' ? '−' : '+'}</span>
                    </div>
                    {activeSection === 'guide' && (
                        <div className="section-content">
                            <div className="guide-steps">
                                <div className="guide-step">
                                    <div className="step-number">1</div>
                                    <div className="step-content">
                                        <strong>Выберите направление</strong>
                                        <p>Нажмите "Покупка" или "Продажа" USDT</p>
                                    </div>
                                </div>
                                <div className="guide-step">
                                    <div className="step-number">2</div>
                                    <div className="step-content">
                                        <strong>Введите сумму</strong>
                                        <p>Укажите сумму для обмена в соответствующем поле</p>
                                    </div>
                                </div>
                                <div className="guide-step">
                                    <div className="step-number">3</div>
                                    <div className="step-content">
                                        <strong>Выберите способ оплаты</strong>
                                        <p>Выберите подходящий банк для перевода</p>
                                    </div>
                                </div>
                                <div className="guide-step">
                                    <div className="step-number">4</div>
                                    <div className="step-content">
                                        <strong>Подтвердите операцию</strong>
                                        <p>Нажмите кнопку обмена и следуйте инструкциям</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Безопасность */}
                <div className="security-notice">
                    <div className="security-icon">🛡️</div>
                    <div className="security-content">
                        <h4>Безопасность прежде всего</h4>
                        <p>Никогда не сообщайте свои пароли и приватные ключи третьим лицам, включая сотрудников поддержки, существует только один аккаунт для оффициального обращения @tetherrabbit_support.</p>
                    </div>
                </div>
            </div>

            {/* Нижняя навигация */}
            <div className="bottom-nav">
                <button className="nav-button" onClick={() => navigateTo('home')}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 7v6h2V9h-2zm1 11c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="#858589"/>
                        <path d="M11 7h2v6h-2z" fill="#858589"/>
                    </svg>
                    <span>Обмен</span>
                </button>
                
                <button className="nav-button" onClick={() => navigateTo('profile')}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" fill="#858589"/>
                    </svg>
                    <span>Профиль</span>
                </button>
                
                <button className="nav-button" onClick={() => navigateTo('history')}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path fillRule="evenodd" clipRule="evenodd" d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" fill="#858589"/>
                        <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z" fill="#858589"/>
                    </svg>
                    <span>История</span>
                </button>
                
                <button className="nav-button active">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" fill="#007CFF"/>
                    </svg>
                    <span>Справка</span>
                </button>
            </div>
        </div>
    );
}

export default Help;