import React, { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import './App.css';

const API = 'https://hr-bot-production-eedd.up.railway.app';
const ADMIN_ID = 7639287231;

function App() {
  const [userId, setUserId] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [stats, setStats] = useState(null);
  const [plannedShifts, setPlannedShifts] = useState([]);
  const [pastShifts, setPastShifts] = useState([]);
  const [screen, setScreen] = useState('home');
  const [subScreen, setSubScreen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [screenLoading, setScreenLoading] = useState(false);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [elapsed, setElapsed] = useState({ hours: 0, minutes: 0, seconds: 0, earned: 0 });
  const [confirmClose, setConfirmClose] = useState(false);
  const [adminStats, setAdminStats] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editRate, setEditRate] = useState('');
  const [editWorkplace, setEditWorkplace] = useState('');
  const [newShift, setNewShift] = useState({ date: '', start: '', end: '', note: '' });
  const [adminEmpShifts, setAdminEmpShifts] = useState([]);
  const [adminEmpPlanned, setAdminEmpPlanned] = useState([]);
  const [debugInfo, setDebugInfo] = useState('');
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    WebApp.ready();
    WebApp.expand();

    let detectedId = null;
    let debug = '';

    const tgUser = WebApp.initDataUnsafe?.user;
    debug += `Method1: ${JSON.stringify(tgUser)}\n`;
    if (tgUser && tgUser.id) {
      detectedId = parseInt(tgUser.id);
      debug += `Detected via Method1: ${detectedId}\n`;
    }

    if (!detectedId) {
      try {
        const params = new URLSearchParams(WebApp.initData);
        const userStr = params.get('user');
        if (userStr) {
          const parsed = JSON.parse(decodeURIComponent(userStr));
          detectedId = parseInt(parsed.id);
          debug += `Detected via Method2: ${detectedId}\n`;
        } else {
          debug += `Method2: no user in initData\n`;
        }
      } catch (e) {
        debug += `Method2 error: ${e.message}\n`;
      }
    }

    if (!detectedId) {
      const urlParams = new URLSearchParams(window.location.search);
      const uidParam = urlParams.get('uid');
      if (uidParam) {
        detectedId = parseInt(uidParam);
        debug += `Detected via URL param: ${detectedId}\n`;
      }
    }

    debug += `Platform: ${WebApp.platform}\nVersion: ${WebApp.version}\n`;

    if (detectedId) {
      setUserId(detectedId);
      setIsAdmin(detectedId === ADMIN_ID);
      fetchEmployee(detectedId);
    } else {
      debug += `FINAL: Could not detect user ID\n`;
      setLoading(false);
    }

    setDebugInfo(debug);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      fetchPlanned(id);
    } catch {
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (id) => {
    try {
      const res = await fetch(`${API}/employee/${id}/stats`);
      const data = await res.json();
      setStats(data);
    } catch {}
  };

  const fetchPlanned = async (id) => {
    try {
      const res = await fetch(`${API}/employee/${id}/planned`);
      const data = await res.json();
      setPlannedShifts(data);
    } catch {}
  };

  const fetchPastShifts = async (id) => {
    try {
      const res = await fetch(`${API}/employee/${id}/shifts?period=3months`);
      const data = await res.json();
      setPastShifts(data);
    } catch {}
  };

  const fetchAdminStats = async () => {
    try {
      const res = await fetch(`${API}/admin/stats`);
      const data = await res.json();
      setAdminStats(data);
    } catch {}
  };

  const fetchAdminEmpData = async (emp) => {
    try {
      const [shiftsRes, plannedRes] = await Promise.all([
        fetch(`${API}/admin/employee/${emp.telegram_id}/shifts`),
        fetch(`${API}/admin/employee/${emp.telegram_id}/planned`)
      ]);
      setAdminEmpShifts(await shiftsRes.json());
      setAdminEmpPlanned(await plannedRes.json());
    } catch {}
  };

  const navigateTo = (s) => {
    setScreenLoading(true);
    setTimeout(() => {
      setScreen(s);
      setSubScreen(null);
      setScreenLoading(false);
    }, 400);
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3500);
  };

  const openShift = async () => {
    setShiftLoading(true);
    try {
      const res = await fetch(`${API}/employee/${userId}/shift/open`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showMessage(`✅ Смена открыта в ${data.time} (НСК)`);
        fetchStats(userId);
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
      const res = await fetch(`${API}/employee/${userId}/shift/close`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const msg = data.warning
          ? `⚠️ ${data.warning}\n✅ Отработано: ${data.hours_worked}ч | ${data.earned} ₽`
          : `✅ Смена закрыта! ${data.hours_worked}ч | ${data.earned} ₽`;
        showMessage(msg);
        fetchStats(userId);
      } else {
        showMessage(data.error, 'error');
      }
    } catch {
      showMessage('Ошибка соединения', 'error');
    }
    setShiftLoading(false);
  };

  const saveEmployeeEdit = async () => {
    try {
      await fetch(`${API}/admin/employee/${selectedEmployee.telegram_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hourly_rate: editRate, workplace: editWorkplace })
      });
      showMessage('✅ Данные обновлены');
      setEditMode(false);
      fetchAdminStats();
      setSelectedEmployee({ ...selectedEmployee, hourly_rate: parseFloat(editRate), workplace: editWorkplace });
    } catch {
      showMessage('Ошибка', 'error');
    }
  };

  const addPlannedShift = async () => {
    if (!newShift.date || !newShift.start || !newShift.end) return showMessage('Заполни дату и время', 'error');
    try {
      await fetch(`${API}/admin/planned-shift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: selectedEmployee.telegram_id, planned_date: newShift.date, shift_start: newShift.start, shift_end: newShift.end, note: newShift.note })
      });
      showMessage('✅ Смена добавлена');
      setNewShift({ date: '', start: '', end: '', note: '' });
      fetchAdminEmpData(selectedEmployee);
    } catch {
      showMessage('Ошибка', 'error');
    }
  };

  const deletePlannedShift = async (id) => {
    await fetch(`${API}/admin/planned-shift/${id}`, { method: 'DELETE' });
    fetchAdminEmpData(selectedEmployee);
  };

  if (loading) return (
    <div className="loader-screen">
      <div className="loader"></div>
    </div>
  );

  if (!userId) return (
    <div className="not-found">
      <div className="not-found-icon">⚠️</div>
      <h2>Ошибка авторизации</h2>
      <p>Не удалось определить пользователя. Открой приложение через бота.</p>
      <div style={{marginTop:'1rem'}}>
        <button onClick={() => setShowDebug(!showDebug)} style={{background:'none',border:'1px solid #333',color:'#555',padding:'0.4rem 0.8rem',borderRadius:'8px',fontSize:'0.75rem',cursor:'pointer'}}>
          {showDebug ? 'Скрыть' : 'Debug'}
        </button>
        {showDebug && (
          <pre style={{fontSize:'0.65rem',color:'#444',marginTop:'0.5rem',textAlign:'left',padding:'0.5rem',background:'#111',borderRadius:'8px',overflow:'auto',maxHeight:'200px'}}>
            {debugInfo}
          </pre>
        )}
      </div>
    </div>
  );

  if (!employee && !isAdmin) return (
    <div className="not-found">
      <div className="not-found-icon">🔒</div>
      <h2>Нет доступа</h2>
      <p>Ты не зарегистрирован в системе.</p>
      <p style={{fontSize:'0.8rem',color:'#555',marginTop:'0.3rem'}}>Обратись к администратору.</p>
      <p style={{fontSize:'0.7rem',color:'#444',marginTop:'0.5rem'}}>ID: {userId}</p>
    </div>
  );

  return (
    <div className="app">
      {screenLoading && (
        <div className="screen-loader-overlay">
          <div className="screen-loader-spinner"></div>
        </div>
      )}

      {message && <div className={`toast ${message.type}`}>{message.text}</div>}

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
                Отмечай начало и конец смены — система автоматически считает <strong>отработанные часы</strong> и <strong>заработок</strong> на основе твоей ставки.
              </p>
            </div>
          </div>
        )}

        {screen === 'schedule' && (
          <div className="screen">
            <h2 className="screen-title">График</h2>
            {plannedShifts.length === 0 ? (
              <div className="empty">Плановых смен пока нет</div>
            ) : plannedShifts.map(shift => (
              <div key={shift.id} className="shift-item">
                <div className="shift-date">{shift.planned_date.slice(8, 10)}.{shift.planned_date.slice(5, 7)}</div>
                <div className="shift-info">
                  <span className="shift-time">{shift.shift_start} — {shift.shift_end}</span>
                  {shift.note ? <span className="shift-hours">{shift.note}</span> : null}
                </div>
                <div className="shift-earned planned-badge">план</div>
              </div>
            ))}
          </div>
        )}

        {screen === 'profile' && employee && !subScreen && (
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
            <button className="btn-secondary" onClick={() => { setSubScreen('history'); fetchPastShifts(userId); }}>
              📋 Учёт смен
            </button>
          </div>
        )}

        {screen === 'profile' && subScreen === 'history' && (
          <div className="screen">
            <div className="screen-header">
              <button className="back-btn" onClick={() => setSubScreen(null)}>← Назад</button>
              <h2 className="screen-title">Учёт смен</h2>
            </div>
            {pastShifts.length === 0 ? (
              <div className="empty">Смен пока нет</div>
            ) : pastShifts.map(shift => {
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

        {screen === 'admin' && isAdmin && !selectedEmployee && (
          <div className="screen">
            <h2 className="screen-title">Сотрудники</h2>
            {adminStats.length === 0 ? (
              <div className="empty">Сотрудников пока нет</div>
            ) : adminStats.map(emp => (
              <div key={emp.id} className="admin-employee-card" onClick={() => { setSelectedEmployee(emp); setEditRate(emp.hourly_rate); setEditWorkplace(emp.workplace); fetchAdminEmpData(emp); }}>
                <div className="admin-employee-header">
                  <div className="admin-avatar">{emp.first_name[0]}{emp.last_name[0]}</div>
                  <div className="admin-employee-info">
                    <span className="admin-employee-name">{emp.first_name} {emp.last_name}</span>
                    <span className="admin-employee-workplace">{emp.workplace}</span>
                  </div>
                  <div>{emp.on_shift ? '🟢' : '⚪'}</div>
                </div>
                <div className="admin-employee-stats">
                  <div className="admin-stat"><span className="admin-stat-value">{emp.shifts_count || 0}</span><span className="admin-stat-label">Смен</span></div>
                  <div className="admin-stat"><span className="admin-stat-value">{emp.total_hours ? parseFloat(emp.total_hours).toFixed(1) : '0'}ч</span><span className="admin-stat-label">Часов</span></div>
                  <div className="admin-stat"><span className="admin-stat-value">{emp.total_earned ? parseFloat(emp.total_earned).toFixed(0) : '0'}₽</span><span className="admin-stat-label">Заработано</span></div>
                  <div className="admin-stat"><span className="admin-stat-value">{emp.hourly_rate}₽</span><span className="admin-stat-label">Ставка/ч</span></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {screen === 'admin' && isAdmin && selectedEmployee && !subScreen && (
          <div className="screen">
            <div className="screen-header">
              <button className="back-btn" onClick={() => { setSelectedEmployee(null); setEditMode(false); }}>← Назад</button>
              <h2 className="screen-title">{selectedEmployee.first_name} {selectedEmployee.last_name}</h2>
            </div>
            {!editMode ? (
              <>
                <div className="profile-info">
                  <div className="info-row"><span className="info-label">Место работы</span><span className="info-value">{selectedEmployee.workplace}</span></div>
                  <div className="info-row"><span className="info-label">Ставка</span><span className="info-value">{selectedEmployee.hourly_rate} ₽/час</span></div>
                  <div className="info-row"><span className="info-label">Статус</span><span className="info-value">{selectedEmployee.on_shift ? '🟢 На смене' : '⚪ Не работает'}</span></div>
                </div>
                <button className="btn-secondary" onClick={() => setEditMode(true)}>✏️ Редактировать</button>
                <button className="btn-secondary" onClick={() => setSubScreen('emp-history')}>📋 История смен</button>
                <button className="btn-secondary" onClick={() => setSubScreen('emp-planned')}>📅 Плановые смены</button>
              </>
            ) : (
              <div className="edit-form">
                <div className="form-group">
                  <label>Место работы</label>
                  <input className="form-input" value={editWorkplace} onChange={e => setEditWorkplace(e.target.value)} placeholder="Название компании" />
                </div>
                <div className="form-group">
                  <label>Ставка (₽/час)</label>
                  <input className="form-input" type="number" value={editRate} onChange={e => setEditRate(e.target.value)} placeholder="500" />
                </div>
                <div className="confirm-buttons">
                  <button className="confirm-btn confirm-cancel" onClick={() => setEditMode(false)}>Отмена</button>
                  <button className="confirm-btn confirm-ok" onClick={saveEmployeeEdit}>Сохранить</button>
                </div>
              </div>
            )}
          </div>
        )}

        {screen === 'admin' && subScreen === 'emp-history' && (
          <div className="screen">
            <div className="screen-header">
              <button className="back-btn" onClick={() => setSubScreen(null)}>← Назад</button>
              <h2 className="screen-title">История смен</h2>
            </div>
            {adminEmpShifts.length === 0 ? (
              <div className="empty">Смен пока нет</div>
            ) : adminEmpShifts.map(shift => {
              const start = new Date(shift.start_time);
              const end = new Date(shift.end_time);
              return (
                <div key={shift.id} className="shift-item">
                  <div className="shift-date">{start.getDate()}.{String(start.getMonth() + 1).padStart(2, '0')}</div>
                  <div className="shift-info">
                    <span className="shift-time">{String(start.getHours()).padStart(2, '0')}:{String(start.getMinutes()).padStart(2, '0')} — {String(end.getHours()).padStart(2, '0')}:{String(end.getMinutes()).padStart(2, '0')}</span>
                    <span className="shift-hours">{parseFloat(shift.hours_worked).toFixed(1)}ч</span>
                  </div>
                  <div className="shift-earned">{shift.earned}₽</div>
                </div>
              );
            })}
          </div>
        )}

        {screen === 'admin' && subScreen === 'emp-planned' && (
          <div className="screen">
            <div className="screen-header">
              <button className="back-btn" onClick={() => setSubScreen(null)}>← Назад</button>
              <h2 className="screen-title">Плановые смены</h2>
            </div>
            <div className="edit-form">
              <div className="form-group">
                <label>Дата</label>
                <input className="form-input" type="date" value={newShift.date} onChange={e => setNewShift({...newShift, date: e.target.value})} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Начало</label>
                  <input className="form-input" type="time" value={newShift.start} onChange={e => setNewShift({...newShift, start: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Конец</label>
                  <input className="form-input" type="time" value={newShift.end} onChange={e => setNewShift({...newShift, end: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>Заметка (необязательно)</label>
                <input className="form-input" value={newShift.note} onChange={e => setNewShift({...newShift, note: e.target.value})} placeholder="Например: ночная смена" />
              </div>
              <button className="done-btn" onClick={() => document.activeElement.blur()}>Готово ✓</button>
              <button className="btn btn-open" style={{width:'100%'}} onClick={addPlannedShift}>+ Добавить смену</button>
            </div>
            <div className="shifts-list" style={{marginTop:'1rem'}}>
              {adminEmpPlanned.length === 0 ? (
                <div className="empty">Плановых смен нет</div>
              ) : adminEmpPlanned.map(shift => (
                <div key={shift.id} className="shift-item">
                  <div className="shift-date">{shift.planned_date.slice(8, 10)}.{shift.planned_date.slice(5, 7)}</div>
                  <div className="shift-info">
                    <span className="shift-time">{shift.shift_start} — {shift.shift_end}</span>
                    {shift.note ? <span className="shift-hours">{shift.note}</span> : null}
                  </div>
                  <button className="delete-btn" onClick={() => deletePlannedShift(shift.id)}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      <nav className="bottom-nav">
        <button className={`nav-item ${screen === 'home' ? 'active' : ''}`} onClick={() => navigateTo('home')}>
          <span className="nav-icon">🏠</span>
          <span className="nav-label">Главная</span>
        </button>
        <button className={`nav-item ${screen === 'schedule' ? 'active' : ''}`} onClick={() => navigateTo('schedule')}>
          <span className="nav-icon">📅</span>
          <span className="nav-label">График</span>
        </button>
        <button className={`nav-item ${screen === 'profile' ? 'active' : ''}`} onClick={() => navigateTo('profile')}>
          <span className="nav-icon">👤</span>
          <span className="nav-label">Профиль</span>
        </button>
        <button className={`nav-item ${screen === 'support' ? 'active' : ''}`} onClick={() => navigateTo('support')}>
          <span className="nav-icon">💬</span>
          <span className="nav-label">Поддержка</span>
        </button>
        {isAdmin && (
          <button className={`nav-item ${screen === 'admin' ? 'active' : ''}`} onClick={() => { navigateTo('admin'); fetchAdminStats(); }}>
            <span className="nav-icon">⚙️</span>
            <span className="nav-label">Админ</span>
          </button>
        )}
      </nav>
    </div>
  );
}

export default App;