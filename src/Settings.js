import React from 'react';

function Settings({ theme, setTheme, timezone, setTimezone }) {
    return (
        <div>
            <h2>Настройки</h2>
            <div>
                <h3>Смена темы</h3>
                <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
                    {theme === 'light' ? 'Сменить на темную тему' : 'Сменить на светлую тему'}
                </button>
            </div>
            <div>
                <h3>Выбор часового пояса</h3>
                <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                    <option value="UTC">UTC</option>
                    <option value="GMT">GMT</option>
                    <option value="EST">EST</option>
                    <option value="CST">CST</option>
                    {/* Добавьте другие часовые пояса по необходимости */}
                </select>
            </div>
        </div>
    );
}

export default Settings;