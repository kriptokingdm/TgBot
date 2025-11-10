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
            if (rule.title.toLowerCase().includes(lowerQuery) || 
                rule.description.toLowerCase().includes(lowerQuery)) {
                results.push({
                    type: 'rule',
                    title: rule.title,
                    content: rule.description,
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
        "Поддержка",
        "Правила безопасности",
        "Как отменить заявку?",
        "Верификация аккаунта"
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

    // ОБНОВЛЕННЫЕ ПРАВИЛА
    const rules = [
        {
            title: "✅ Верификация аккаунта",
            description: "Для совершения операций требуется полная верификация аккаунта. Предоставьте необходимые документы по запросу поддержки."
        },
        {
            title: "⚡ Время выполнения операций",
            description: "Стандартное время обработки заявки - 5-30 минут. В пиковые часы время может увеличиться до 60 минут."
        },
        {
            title: "💰 Лимиты операций",
            description: "Минимальная сумма обмена: 300 RUB / 3 USDT. Максимальная сумма для новых пользователей: 50,000 RUB. После верификации лимиты повышаются."
        },
        {
            title: "🔐 Безопасность операций",
            description: "Запрещены операции с целью отмывания денег, финансирования терроризма и других незаконных деяний."
        },
        {
            title: "📝 Требования к платежам",
            description: "Платежи должны осуществляться только с банковских счетов, принадлежащих владельцу аккаунта. Третьи лица не допускаются."
        },
        {
            title: "⏰ Авто-отмена заявок",
            description: "Неоплаченные заявки автоматически отменяются через 15 минут. Оплаченные заявки обрабатываются в течение 24 часов."
        },
        {
            title: "🔄 Возвраты и отмены",
            description: "Отмена операции возможна только до момента подтверждения платежа. После подтверждения возврат осуществляется по согласованию с поддержкой."
        },
        {
            title: "📊 Курс обмена",
            description: "Курс фиксируется на момент создания заявки. Изменения курса во время обработки не влияют на зафиксированную сумму."
        },
        {
            title: "🚫 Запрещенные операции",
            description: "Запрещены попытки обмана, использование чужих платежных средств, создание мультиаккаунтов."
        },
        {
            title: "🎯 Ответственность пользователя",
            description: "Пользователь несет ответственность за правильность введенных реквизитов. Проверяйте данные перед подтверждением операции."
        }
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

                {/* ОБНОВЛЕННАЯ СЕКЦИЯ ПРАВИЛ */}
                <div className={`help-section ${activeSection === 'rules' ? 'active' : ''}`}>
                    <div className="section-header" onClick={() => toggleSection('rules')}>
                        <h3>⚖️ Правила использования обменника</h3>
                        <span className="toggle-icon">{activeSection === 'rules' ? '−' : '+'}</span>
                    </div>
                    {activeSection === 'rules' && (
                        <div className="section-content">
                            <div className="rules-grid">
                                {rules.map((rule, index) => (
                                    <div key={index} id={`rules-${index}`} className="rule-card">
                                        <div className="rule-icon">📌</div>
                                        <div className="rule-content">
                                            <h4 className="rule-title">{rule.title}</h4>
                                            <p className="rule-description">{rule.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="important-note">
                                <strong>⚠️ Важно:</strong> Нарушение правил может привести к блокировке аккаунта и заморозке средств. 
                                Перед совершением операции убедитесь, что вы ознакомились со всеми правилами.
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
                
                <button className="nav-button active">
                    <span>❓</span>
                    <span>Справка</span>
                </button>
            </div>
        </div>
    );
}

export default Help;

