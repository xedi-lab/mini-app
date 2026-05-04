import React, { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import './App.css';

const API = 'http://localhost:3001';
const ADMIN_ID = 7639287231;

function App() {
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [stats, setStats] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [screen, setScreen] = useState('home');
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [elapsed, setElapsed] = useState({ hours: 0, minutes: 0, seconds: 0, earned: 0 });
  const [confirmClose, setConfirmClose] = useState(false);
  const [adminStats, setAdminStats] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    WebApp.ready();
    WebApp.expand();
    const tgUser = WebApp.initDataUnsafe?.user;
    if (tgUser) {
      setUser(tgUser);
      setIsAdmin(tgUser.id === ADMIN_ID);
      fetchEmployee(tgUser.id);
    } else {
      setIsAdmin(true);
      fetchEmployee(ADMIN_ID);
    }
  }, []);

  useEffect(() => {
    if (!stats?.on_shift || !stats?.open_shift) return;
    const tick = () => {
      const now = new Date();
      now.setHours(now.getUTCHours() + 7);
      const start = new Date(stats.open_shift.start_time);
      const diffMs = now - start;
      const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      const earned = parseFloat(((totalSeconds / 3600) * employee?.hourly_rate).toFixed(2));
      setElapsed({ hours, minutes, seconds, earned });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [stats?.on_shift, stats?.open_shift, employee]);

  const fetchEmployee = async (id) => {
    try {
      const res = await fetch(`${API}/employee/${id}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setEmployee(data);
      fetchStats(id);
    } catch {
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (id) => {
    const res = await fetch(`${API}/employee/${id}/stats`);
    const data = await res.json();
    setStats(data);
  };

  const fetchShifts = async (id, p = 'month') => {
    const res = await fetch(`${API}/employee/${id}/shifts?period=${p}`);
    const data = await res.json();
    setShifts(data);
  };

  const fetchAdminStats = async () => {
    const res = await fetch(`${API}/admin/stats`);
    const data = await res.json();
    setAdminStats(data);
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3500);
  };

  const openShift = async () => {
    setShiftLoading(true);
    try {
      const id = user?.id || ADMIN_ID;
      const res = await fetch(`${API}/employee/${id}/shift/open`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showMessage(`✅ Смена открыта в ${data.time} (НСК)`);
        fetchStats(id);
      } else {
        showMessage(data.error, 'error');
      }
    } catch {
      showMessage('Ошибка соединения', 'error');
    }
    setShiftLoading(false);
  };

  const closeShift = async () => {
    setConfirmClose(false);
    setShiftLoading(true);
    try {
      const id = user?.id || ADMIN_ID;
      const res = await fetch(`${API}/employee/${id}/shift/close`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const msg = data.warning
          ? `⚠️ ${data.warning}\n✅ Отработано: ${data.hours_worked}ч | ${data.earned} ₽`
          : `✅ Смена закрыта! ${data.hours_worked}ч | ${data.earned} ₽`;
        showMessage(msg);
        fetchStats(id);
      } else {
        showMessage(data.error, 'error');
      }
    } catch {
      showMessage('Ошибка соединения', 'error');
    }
    setShiftLoading(false);
  };

  if (loading) return (
    <div className="loader-screen">
      <div className="loader"></div>
    </div>
  );

  if (!employee && !isAdmin) return (
    <div className="not-found">
      <div className="not-found-icon">🔒</div>
      <h2>Нет доступа</h2>
      <p>Ты не зарегистрирован в системе. Обратись к администратору.</p>
    </div>
  );

  return (
    <div className="app">
      {message && (
        <div className={`toast ${message.type}`}>
          {message.text}
        </div>
      )}

      {confirmClose && (
        <div className="confirm-overlay">
          <div className="confirm-modal">
            <h3>Закрыть смену?</h3>
            <p>Убедись что ты закончил работу. Это действие нельзя отменить.</p>
            <div className="confirm-buttons">
              <button className="confirm-btn confirm-cancel" onClick={() => setConfirmClose(false)}>Отмена</button>
              <button className="confirm-btn confirm-ok" onClick={closeShift}>Закрыть</button>
            </div>
          </div>
        </div>
      )}

      <div className="content">
        {screen === 'home' && employee && (
          <div className="screen">
            <div className="greeting">
              <span className="greeting-sub">Добро пожаловать</span>
              <h1>{employee.first_name} {employee.last_name}</h1>
              <span className="workplace">{employee.workplace}</span>
            </div>

            <div className="status-card">
              <div className={`status-dot ${stats?.on_shift ? 'active' : ''}`}></div>
              <span>{stats?.on_shift ? 'Смена открыта' : 'Не на смене'}</span>
            </div>

            <div className="shift-buttons">
              <button className="btn btn-open" onClick={openShift} disabled={shiftLoading || stats?.on_shift}>
                {shiftLoading ? '...' : '🟢 Открыть смену'}
              </button>
              <button className="btn btn-close" onClick={() => setConfirmClose(true)} disabled={shiftLoading || !stats?.on_shift}>
                {shiftLoading ? '...' : '🔴 Закрыть смену'}
              </button>
            </div>

            <div className="stats-row">
              <div className="stat-card">
                <span className="stat-value">{stats?.shifts_count || 0}</span>
                <span className="stat-label">Смен</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{stats?.total_hours ? parseFloat(stats.total_hours).toFixed(1) : '0'}ч</span>
                <span className="stat-label">Часов</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{stats?.total_earned ? parseFloat(stats.total_earned).toFixed(0) : '0'}₽</span>
                <span className="stat-label">Заработано</span>
              </div>
            </div>

            {stats?.on_shift && (
              <div className="timer-card">
                <div className="timer-label">Текущая смена</div>
                <div className="timer-value">
                  {String(elapsed.hours).padStart(2, '0')}:{String(elapsed.minutes).padStart(2, '0')}:{String(elapsed.seconds).padStart(2, '0')}
                </div>
                <div className="timer-earned">+ {elapsed.earned} ₽</div>
              </div>
            )}

            <div className="info-card">
              <span className="info-card-title">Как это работает</span>
              <p className="info-card-text">
                Отмечай начало и конец смены — система автоматически считает <strong>отработанные часы</strong> и <strong>заработок</strong> на основе твоей ставки. История смен и статистика всегда под рукой.
              </p>
            </div>
          </div>
        )}

        {screen === 'schedule' && (
          <div className="screen">
            <h2 className="screen-title">График</h2>
            <div className="period-tabs">
              {['week', 'month', '3months'].map(p => (
                <button key={p} className={`period-tab ${period === p ? 'active' : ''}`} onClick={() => { setPeriod(p); fetchShifts(user?.id || ADMIN_ID, p); }}>
                  {p === 'week' ? 'Неделя' : p === 'month' ? 'Месяц' : '3 месяца'}
                </button>
              ))}
            </div>
            <div className="shifts-list">
              {shifts.length === 0 ? (
                <div className="empty">Смен за этот период нет</div>
              ) : shifts.map(shift => {
                const start = new Date(shift.start_time);
                const end = new Date(shift.end_time);
                return (
                  <div key={shift.id} className="shift-item">
                    <div className="shift-date">{start.getDate()}.{String(start.getMonth() + 1).padStart(2, '0')}</div>
                    <div className="shift-info">
                      <span className="shift-time">
                        {String(start.getHours()).padStart(2, '0')}:{String(start.getMinutes()).padStart(2, '0')} — {String(end.getHours()).padStart(2, '0')}:{String(end.getMinutes()).padStart(2, '0')}
                      </span>
                      <span className="shift-hours">{parseFloat(shift.hours_worked).toFixed(1)}ч</span>
                    </div>
                    <div className="shift-earned">{shift.earned}₽</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {screen === 'profile' && employee && (
          <div className="screen">
            <h2 className="screen-title">Профиль</h2>
            <div className="profile-card">
              <div className="profile-avatar">{employee.first_name[0]}{employee.last_name[0]}</div>
              <h3>{employee.first_name} {employee.last_name}</h3>
              <span className="profile-workplace">{employee.workplace}</span>
            </div>
            <div className="profile-info">
              <div className="info-row"><span className="info-label">Ставка</span><span className="info-value">{employee.hourly_rate} ₽/час</span></div>
              <div className="info-row"><span className="info-label">Смен за месяц</span><span className="info-value">{stats?.shifts_count || 0}</span></div>
              <div className="info-row"><span className="info-label">Часов за месяц</span><span className="info-value">{stats?.total_hours ? parseFloat(stats.total_hours).toFixed(1) : '0'} ч</span></div>
              <div className="info-row"><span className="info-label">Заработано за месяц</span><span className="info-value">{stats?.total_earned ? parseFloat(stats.total_earned).toFixed(2) : '0.00'} ₽</span></div>
            </div>
          </div>
        )}

        {screen === 'support' && (
          <div className="screen">
            <h2 className="screen-title">Поддержка</h2>
            <div className="support-card">
              <div className="support-icon">💬</div>
              <p>По всем вопросам обращайтесь:</p>
              <a href="https://t.me/твой_юзернейм" className="support-link">@администратор</a>
              <a href="https://t.me/твой_юзернейм" className="support-link">@разработчик</a>
            </div>
          </div>
        )}

        {screen === 'admin' && isAdmin && (
          <div className="screen">
            <h2 className="screen-title">Админ-панель</h2>
            {adminStats.length === 0 ? (
              <div className="empty">Сотрудников пока нет</div>
            ) : adminStats.map(emp => (
              <div key={emp.id} className="admin-employee-card">
                <div className="admin-employee-header">
                  <div className="admin-avatar">{emp.first_name[0]}{emp.last_name[0]}</div>
                  <div className="admin-employee-info">
                    <span className="admin-employee-name">{emp.first_name} {emp.last_name}</span>
                    <span className="admin-employee-workplace">{emp.workplace}</span>
                  </div>
                  <div className={`admin-status ${emp.on_shift ? 'active' : ''}`}>
                    {emp.on_shift ? '🟢' : '⚪'}
                  </div>
                </div>
                <div className="admin-employee-stats">
                  <div className="admin-stat">
                    <span className="admin-stat-value">{emp.shifts_count || 0}</span>
                    <span className="admin-stat-label">Смен</span>
                  </div>
                  <div className="admin-stat">
                    <span className="admin-stat-value">{emp.total_hours ? parseFloat(emp.total_hours).toFixed(1) : '0'}ч</span>
                    <span className="admin-stat-label">Часов</span>
                  </div>
                  <div className="admin-stat">
                    <span className="admin-stat-value">{emp.total_earned ? parseFloat(emp.total_earned).toFixed(0) : '0'}₽</span>
                    <span className="admin-stat-label">Заработано</span>
                  </div>
                  <div className="admin-stat">
                    <span className="admin-stat-value">{emp.hourly_rate}₽</span>
                    <span className="admin-stat-label">Ставка/ч</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <nav className="bottom-nav">
        <button className={`nav-item ${screen === 'home' ? 'active' : ''}`} onClick={() => setScreen('home')}>
          <span className="nav-icon">🏠</span>
          <span className="nav-label">Главная</span>
        </button>
        <button className={`nav-item ${screen === 'schedule' ? 'active' : ''}`} onClick={() => { setScreen('schedule'); fetchShifts(user?.id || ADMIN_ID, period); }}>
          <span className="nav-icon">📅</span>
          <span className="nav-label">График</span>
        </button>
        <button className={`nav-item ${screen === 'profile' ? 'active' : ''}`} onClick={() => setScreen('profile')}>
          <span className="nav-icon">👤</span>
          <span className="nav-label">Профиль</span>
        </button>
        <button className={`nav-item ${screen === 'support' ? 'active' : ''}`} onClick={() => setScreen('support')}>
          <span className="nav-icon">💬</span>
          <span className="nav-label">Поддержка</span>
        </button>
        {isAdmin && (
          <button className={`nav-item ${screen === 'admin' ? 'active' : ''}`} onClick={() => { setScreen('admin'); fetchAdminStats(); }}>
            <span className="nav-icon">⚙️</span>
            <span className="nav-label">Админ</span>
          </button>
        )}
      </nav>
    </div>
  );
}

export default App;