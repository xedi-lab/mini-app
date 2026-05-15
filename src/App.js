import config from './config';
import React, { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import './App.css';

const API = 'https://hr-bot-production-eedd.up.railway.app';
const ADMIN_ID = 7639287231;

function ScheduleCalendar({ shifts, workedShifts = [] }) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const [selectedDate, setSelectedDate] = useState(null);
  const [showMore, setShowMore] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

  const startOfGrid = new Date(monthStart);
  const dayOfWeek = monthStart.getDay();
  startOfGrid.setDate(monthStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  const weeksToShow = showMore ? 6 : 2;
  const days = Array.from({ length: weeksToShow * 7 }, (_, i) => {
    const d = new Date(startOfGrid);
    d.setDate(startOfGrid.getDate() + i);
    return d;
  });

  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const months = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

  const hasPlanned = (dateStr) => shifts.some(s => s.planned_date === dateStr);
  const hasWorked = (dateStr) => workedShifts.some(s => s.date === dateStr);
  const getWorked = (dateStr) => workedShifts.find(s => s.date === dateStr);
  const getPlanned = (dateStr) => shifts.find(s => s.planned_date === dateStr);

  const handleDayClick = (dateStr) => {
    if (hasPlanned(dateStr) || hasWorked(dateStr)) {
      setSelectedDate(dateStr);
      setSheetVisible(true);
    }
  };

  const formatSheetDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    const weekDays = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];
    return `${weekDays[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()].toLowerCase()}`;
  };

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const selectedWorked = selectedDate ? getWorked(selectedDate) : null;
  const selectedPlanned = selectedDate ? getPlanned(selectedDate) : null;

  return (
    <div className="schedule-calendar">
      <div className="calendar-header-row">
        <button className="calendar-nav-btn" onClick={prevMonth}>‹</button>
        <span className="calendar-month-label">{months[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
        <button className="calendar-nav-btn" onClick={nextMonth}>›</button>
      </div>

      {/* ЛЕГЕНДА */}
      <div className="calendar-legend">
        <div className="calendar-legend-item">
          <span className="calendar-legend-dot planned"></span>
          <span>Плановая</span>
        </div>
        <div className="calendar-legend-item">
          <span className="calendar-legend-dot worked"></span>
          <span>Отработана</span>
        </div>
        <div className="calendar-legend-item">
          <span className="calendar-legend-dot both"></span>
          <span>Выполнена</span>
        </div>
      </div>

      <div className="calendar-grid-wrap">
        <div className="calendar-weekdays">
          {dayNames.map(d => (
            <span key={d} className="calendar-weekday">{d}</span>
          ))}
        </div>

        <div className={`calendar-grid ${showMore ? 'expanded' : ''}`}>
          {weeks.map((week, wi) => (
            <div key={wi} className="calendar-week">
              {week.map(d => {
                const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;
                const planned = hasPlanned(dateStr);
                const worked = hasWorked(dateStr);
                const isCurrentMonth = d.getMonth() === currentMonth.getMonth();
                const isPast = d < today && !isToday;

                let cellType = '';
                if (planned && worked) cellType = 'both';
                else if (worked) cellType = 'worked';
                else if (planned) cellType = 'planned';

                return (
                  <button
                    key={dateStr}
                    className={`calendar-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${cellType} ${isPast ? 'past' : ''} ${!isCurrentMonth ? 'other-month' : ''}`}
                    onClick={() => handleDayClick(dateStr)}
                  >
                    <span className="calendar-cell-num">{d.getDate()}</span>
                    {cellType && !isToday && !isSelected && (
                      <span className={`calendar-cell-dot ${cellType}`}></span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <button className="calendar-show-more" onClick={() => setShowMore(!showMore)}>
        <span className={`calendar-show-more-icon ${showMore ? 'rotated' : ''}`}>›</span>
        {showMore ? 'Свернуть' : 'Показать ещё'}
      </button>

      {sheetVisible && (
        <>
          <div className="sheet-overlay" onClick={() => setSheetVisible(false)} />
          <div className="bottom-sheet">
            <div className="sheet-top-row">
              <div className="sheet-handle" />
              <button className="sheet-close" onClick={() => setSheetVisible(false)}>✕</button>
            </div>
            <div className="sheet-date">{formatSheetDate(selectedDate)}</div>

            {selectedWorked && (
              <div className="sheet-shift-card sheet-shift-card--worked">
                <div className="sheet-shift-status">✅ Отработана</div>
                <div className="sheet-shift-time">{selectedWorked.start_time} — {selectedWorked.end_time}</div>
                <div className="sheet-shift-row">
                  <span className="sheet-shift-hours">{selectedWorked.hours_worked}ч</span>
                  <span className="sheet-shift-earned">+{selectedWorked.earned} ₽</span>
                </div>
              </div>
            )}

            {selectedPlanned && !selectedWorked && (
              <div className="sheet-shift-card sheet-shift-card--planned">
                <div className="sheet-shift-status">📅 Плановая</div>
                <div className="sheet-shift-time">{selectedPlanned.shift_start} — {selectedPlanned.shift_end}</div>
                {selectedPlanned.note && <div className="sheet-shift-note">{selectedPlanned.note}</div>}
                <div className="sheet-shift-duration">
                  {(() => {
                    const [sh, sm] = selectedPlanned.shift_start.split(':').map(Number);
                    const [eh, em] = selectedPlanned.shift_end.split(':').map(Number);
                    const dur = (eh * 60 + em) - (sh * 60 + sm);
                    return `${Math.floor(dur / 60)}ч${dur % 60 > 0 ? ` ${dur % 60}м` : ''}`;
                  })()}
                </div>
              </div>
            )}

            {selectedPlanned && selectedWorked && (
              <div className="sheet-shift-card sheet-shift-card--planned">
                <div className="sheet-shift-status">📅 План</div>
                <div className="sheet-shift-time">{selectedPlanned.shift_start} — {selectedPlanned.shift_end}</div>
                {selectedPlanned.note && <div className="sheet-shift-note">{selectedPlanned.note}</div>}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ПИКЕР ДАТЫ
function DatePicker({ value, onChange }) {
  const today = new Date();
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  const dayNames = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
  const months = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];

  return (
    <div className="date-picker-wrap">
      <div className="date-picker-scroll">
        {days.map(d => {
          const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          const isSelected = dateStr === value;
          const isToday = d.toDateString() === today.toDateString();
          return (
            <button
              key={dateStr}
              className={`date-picker-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
              onClick={() => onChange(dateStr)}
            >
              <span className="date-picker-dayname">{dayNames[d.getDay()]}</span>
              <span className="date-picker-daynum">{d.getDate()}</span>
              <span className="date-picker-month">{months[d.getMonth()]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TimePicker({ value, onChange, label }) {
  return (
    <div className="time-picker-wrap">
      <span className="time-picker-label">{label}</span>
      <input
        className="time-picker-native"
        type="time"
        value={value || '09:00'}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

function App() {
  const [userId, setUserId] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [stats, setStats] = useState(null);
  const [plannedShifts, setPlannedShifts] = useState([]);
  const [workedShifts, setWorkedShifts] = useState([]);
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
  const [adminDashboard, setAdminDashboard] = useState(null);
  const [adminTab, setAdminTab] = useState('dashboard');
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editRate, setEditRate] = useState('');
  const [editWorkplace, setEditWorkplace] = useState('');
  const [newShift, setNewShift] = useState({ date: '', start: '09:00', end: '21:00', note: '' });
  const [adminEmpShifts, setAdminEmpShifts] = useState([]);
  const [adminEmpPlanned, setAdminEmpPlanned] = useState([]);
  const [debugInfo, setDebugInfo] = useState('');
  const [showDebug, setShowDebug] = useState(false);
  const [regStatus, setRegStatus] = useState(null);
  const [regForm, setRegForm] = useState({ first_name: '', last_name: '' });
  const [regLoading, setRegLoading] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState('month');

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
    setDebugInfo(debug);
    if (detectedId) {
      setUserId(detectedId);
      setIsAdmin(detectedId === ADMIN_ID);
      fetchEmployee(detectedId);
    } else {
      debug += `FINAL: Could not detect user ID\n`;
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!stats?.on_shift || !stats?.open_shift) return;
    const tick = () => {
      const now = new Date();
      const nowNSK = now.getTime() + 7 * 60 * 60 * 1000;
      const start = new Date(stats.open_shift.start_time);
      const diffMs = nowNSK - start.getTime();
      const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      const earned = parseFloat(((totalSeconds / 3600) * employee?.hourly_rate).toFixed(2));
      const nowNSKDate = new Date(nowNSK);
      const endOfDay = new Date(nowNSK);
      endOfDay.setUTCHours(21, 0, 0, 0);
      const remainMs = Math.max(0, endOfDay.getTime() - nowNSKDate.getTime());
      const remainHours = Math.floor(remainMs / 3600000);
      const remainMins = Math.floor((remainMs % 3600000) / 60000);
      setElapsed({ hours, minutes, seconds, earned, remainHours, remainMins });
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
      fetchWorkedShifts(id);
      setLoading(false);
    } catch {
      setEmployee(null);
      if (id !== ADMIN_ID) await checkRegStatus(id);
      setLoading(false);
    }
  };

  const checkRegStatus = async (id) => {
    try {
      const res = await fetch(`${API}/register/status/${id}`);
      const data = await res.json();
      setRegStatus(data.status);
    } catch { setRegStatus('none'); }
  };

  const submitRegistration = async () => {
    if (!regForm.first_name.trim() || !regForm.last_name.trim()) {
      showMessage('Введи имя и фамилию', 'error'); return;
    }
    setRegLoading(true);
    try {
      const res = await fetch(`${API}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: userId, first_name: regForm.first_name.trim(), last_name: regForm.last_name.trim() })
      });
      const data = await res.json();
      if (data.success || data.status === 'pending') setRegStatus('pending');
      else showMessage(data.error || 'Ошибка', 'error');
    } catch { showMessage('Ошибка соединения', 'error'); }
    setRegLoading(false);
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

const fetchWorkedShifts = async (id) => {
  try {
    const res = await fetch(`${API}/employee/${id}/shifts/calendar`);
    const data = await res.json();
    setWorkedShifts(data);
  } catch {}
};

  const fetchPastShifts = async (id) => {
    try {
      const res = await fetch(`${API}/employee/${id}/shifts?period=3months`);
      const data = await res.json();
      setPastShifts(data);
    } catch {}
  };

  const fetchAnalytics = async (id) => {
    try {
      const res = await fetch(`${API}/employee/${id}/analytics`);
      const data = await res.json();
      setAnalytics(data);
    } catch {}
  };

  const fetchAdminStats = async () => {
    try {
      const res = await fetch(`${API}/admin/stats`);
      const data = await res.json();
      setAdminStats(data);
    } catch {}
  };

  const fetchAdminDashboard = async () => {
    try {
      const res = await fetch(`${API}/admin/dashboard`);
      const data = await res.json();
      setAdminDashboard(data);
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
      if (emp.telegram_id === userId) fetchPlanned(userId);
    } catch {}
  };

  const navigateTo = (s) => {
    setScreenLoading(true);
    setTimeout(() => { setScreen(s); setSubScreen(null); setScreenLoading(false); }, 300);
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
      if (data.success) { showMessage(`✅ Присутствие подтверждено в ${data.confirmed_at} (НСК)`); fetchStats(userId); }
      else showMessage(data.error, 'error');
    } catch { showMessage('Ошибка соединения', 'error'); }
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
      } else showMessage(data.error, 'error');
    } catch { showMessage('Ошибка соединения', 'error'); }
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
      fetchAdminDashboard(); fetchAdminStats();
      setSelectedEmployee({ ...selectedEmployee, hourly_rate: parseFloat(editRate), workplace: editWorkplace });
    } catch { showMessage('Ошибка', 'error'); }
  };

  const addPlannedShift = async () => {
  if (!newShift.date) return showMessage('Выбери дату', 'error');
  const start = newShift.start || '09:00';
  const end = newShift.end || '21:00';
  try {
    await fetch(`${API}/admin/planned-shift`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telegram_id: selectedEmployee.telegram_id,
        planned_date: newShift.date,
        shift_start: start,
        shift_end: end,
        note: newShift.note
      })
    });
    showMessage('✅ Смена добавлена');
    setNewShift({ date: '', start: '09:00', end: '21:00', note: '' });
    fetchAdminEmpData(selectedEmployee);
    fetchPlanned(selectedEmployee.telegram_id);
  } catch { showMessage('Ошибка', 'error'); }
};

  const deletePlannedShift = async (id) => {
  const el = document.getElementById(`shift-${id}`);
  if (el) {
    el.style.transition = 'opacity 0.25s ease, transform 0.25s ease, max-height 0.3s ease';
    el.style.opacity = '0';
    el.style.transform = 'translateX(-16px)';
    el.style.maxHeight = '0';
    el.style.padding = '0';
    el.style.margin = '0';
    el.style.overflow = 'hidden';
    await new Promise(r => setTimeout(r, 320));
  }
  await fetch(`${API}/admin/planned-shift/${id}`, { method: 'DELETE' });
  fetchAdminEmpData(selectedEmployee);
  fetchPlanned(selectedEmployee.telegram_id);
};

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  };

  // Следующая плановая смена
  const getNextShift = () => {
    const today = new Date();
    const pad = n => String(n).padStart(2, '0');
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth()+1)}-${pad(tomorrow.getDate())}`;
    const upcoming = plannedShifts
      .filter(s => s.planned_date >= todayStr)
      .sort((a, b) => a.planned_date.localeCompare(b.planned_date));
    if (!upcoming.length) return null;
    const next = upcoming[0];
    const isTomorrow = next.planned_date === tomorrowStr;
    const isToday = next.planned_date === todayStr;
    const d = new Date(next.planned_date + 'T00:00:00');
    const months = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
    const label = isToday ? 'Сегодня' : isTomorrow ? 'Завтра' : `${d.getDate()} ${months[d.getMonth()]}`;
    return { ...next, label, isTomorrow, isToday };
  };

  if (loading) return <div className="loader-screen"><div className="loader"></div></div>;

  if (!userId) return (
    <div className="not-found">
      <div className="not-found-icon">⚠️</div>
      <h2>Ошибка авторизации</h2>
      <p>Не удалось определить пользователя. Открой приложение через бота.</p>
      <div style={{marginTop:'1rem'}}>
        <button onClick={() => setShowDebug(!showDebug)} style={{background:'none',border:'1px solid #ccc',color:'#999',padding:'6px 14px',borderRadius:'8px',fontSize:'0.75rem',cursor:'pointer'}}>
          {showDebug ? 'Скрыть' : 'Debug'}
        </button>
        {showDebug && (
          <pre style={{fontSize:'0.65rem',color:'#999',marginTop:'0.5rem',textAlign:'left',padding:'0.5rem',background:'#f5f5f5',borderRadius:'8px',overflow:'auto',maxHeight:'200px'}}>
            {debugInfo}
          </pre>
        )}
      </div>
    </div>
  );

  if (!employee && !isAdmin && regStatus === 'none') return (
    <div className="onboarding">
      {message && <div className={`toast ${message.type}`}>{message.text}</div>}
      <div className="onboarding-content">
        <div className="onboarding-icon">👋</div>
        <h1 className="onboarding-title">Добро пожаловать</h1>
        <p className="onboarding-subtitle">Заполни данные чтобы подать заявку на доступ</p>
        <div className="onboarding-form">
          <div className="form-group">
            <label>Имя</label>
            <input className="form-input" placeholder="Иван" value={regForm.first_name} onChange={e => setRegForm({...regForm, first_name: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Фамилия</label>
            <input className="form-input" placeholder="Иванов" value={regForm.last_name} onChange={e => setRegForm({...regForm, last_name: e.target.value})} />
          </div>
          <button className="onboarding-btn" onClick={submitRegistration} disabled={regLoading}>
            {regLoading ? 'Отправляем...' : 'Отправить заявку'}
          </button>
        </div>
      </div>
    </div>
  );

  if (!employee && !isAdmin && regStatus === 'pending') return (
    <div className="onboarding">
      <div className="onboarding-content">
        <div className="onboarding-icon">⏳</div>
        <h1 className="onboarding-title">Заявка отправлена</h1>
        <p className="onboarding-subtitle">Администратор рассматривает твою заявку. Как только она будет одобрена — ты получишь доступ.</p>
        <button className="onboarding-btn-secondary" onClick={() => checkRegStatus(userId)}>Проверить статус</button>
      </div>
    </div>
  );

  if (!employee && !isAdmin) return <div className="loader-screen"><div className="loader"></div></div>;

  const nextShift = employee ? getNextShift() : null;

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

        {/* ГЛАВНАЯ */}
        {screen === 'home' && employee && (
          <div className="screen">

            {/* HERO CARD */}
            <div className={`hero-card ${stats?.on_shift ? 'hero-card--active' : ''}`}>
              <div className="hero-top">
                <div className="hero-info">
                  <span className="hero-greeting">Привет,</span>
                  <span className="hero-name">{employee.first_name}</span>
                  <span className="hero-workplace">{employee.workplace}</span>
                </div>
                <div className={`hero-status-badge ${stats?.on_shift ? (stats?.open_shift?.confirmed_at ? 'on' : 'pending') : 'off'}`}>
                  <span className={`hero-status-dot ${stats?.on_shift ? 'active' : ''}`}></span>
                  {stats?.on_shift ? (stats?.open_shift?.confirmed_at ? 'На смене' : 'Ожидает подтверждения') : 'Не на смене'}
                </div>
              </div>

              {stats?.on_shift && (
                <div className="hero-timer">
                  <div className="hero-timer-value">
                    {String(elapsed.hours).padStart(2, '0')}:{String(elapsed.minutes).padStart(2, '0')}:{String(elapsed.seconds).padStart(2, '0')}
                  </div>
                  <div className="hero-timer-earned">+ {elapsed.earned} ₽</div>
                  <div className="hero-timer-remain">до конца смены {elapsed.remainHours}ч {elapsed.remainMins}м</div>
                </div>
              )}
            </div>

            {/* ACTION BUTTON */}
            {stats?.on_shift && stats?.open_shift?.confirmed_at ? (
              <button className="action-btn action-btn--close" onClick={() => setConfirmClose(true)} disabled={shiftLoading}>
                {shiftLoading ? '...' : 'Завершить смену'}
              </button>
            ) : stats?.on_shift && !stats?.open_shift?.confirmed_at ? (
              <button className="action-btn action-btn--open" onClick={openShift} disabled={shiftLoading}>
                {shiftLoading ? '...' : 'Подтвердить присутствие'}
              </button>
            ) : null}

            {/* STATS */}
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

            {/* СЛЕДУЮЩАЯ СМЕНА */}
            {nextShift && (
              <div className={`next-shift-card ${nextShift.isTomorrow ? 'next-shift-card--tomorrow' : ''}`}>
                <div className="next-shift-left">
                  <span className="next-shift-label">{nextShift.label}</span>
                  <span className="next-shift-time">{nextShift.shift_start} — {nextShift.shift_end}</span>
                  {nextShift.note && <span className="next-shift-note">{nextShift.note}</span>}
                </div>
                <div className="next-shift-icon">📅</div>
              </div>
            )}

            {/* FAQ */}
            <div className="info-card">
              <span className="info-card-title">Как это работает</span>
              <div className="info-card-text">
                <div>1. Смена открывается <strong>автоматически</strong> по расписанию</div>
                <div>2. Подтверди присутствие <strong>нажав кнопку</strong></div>
                <div>3. В конце дня смена закроется <strong>автоматически в 21:00</strong></div>
              </div>
            </div>

          </div>
        )}

        {/* ГРАФИК */}
        {screen === 'schedule' && (
  <div className="screen">
    <h2 className="screen-title">График</h2>
    <ScheduleCalendar shifts={plannedShifts} workedShifts={workedShifts} />
  </div>
)}

        {/* ПРОФИЛЬ */}
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
            </div>
            <div className="analytics-tabs">
              <button className={`analytics-tab ${analyticsPeriod === 'week' ? 'active' : ''}`} onClick={() => { setAnalyticsPeriod('week'); if (!analytics) fetchAnalytics(userId); }}>Неделя</button>
              <button className={`analytics-tab ${analyticsPeriod === 'month' ? 'active' : ''}`} onClick={() => { setAnalyticsPeriod('month'); if (!analytics) fetchAnalytics(userId); }}>Месяц</button>
              <button className={`analytics-tab ${analyticsPeriod === 'three_months' ? 'active' : ''}`} onClick={() => { setAnalyticsPeriod('three_months'); if (!analytics) fetchAnalytics(userId); }}>3 месяца</button>
            </div>
            {!analytics ? (
  <div className="skeleton-card">
    <div className="skeleton skeleton-line skeleton-line--short" />
    <div className="skeleton skeleton-line skeleton-line--full" />
    <div className="skeleton skeleton-line skeleton-line--medium" />
  </div>
) : (
              <>
                <div className="analytics-main">
                  <div className="analytics-earned-card">
                    <span className="analytics-earned-label">Заработано</span>
                    <span className="analytics-earned-value">{analytics[analyticsPeriod].earned} ₽</span>
                    <span className="analytics-earned-sub">{analytics[analyticsPeriod].shifts_count} смен · {analytics[analyticsPeriod].hours} ч</span>
                  </div>
                </div>
                {analyticsPeriod === 'month' && (
                <div className="analytics-row" key="month-analytics">
                    <div className="analytics-card">
                      <span className="analytics-card-label">Прогноз</span>
                      <span className="analytics-card-value">{analytics.forecast} ₽</span>
                      <span className="analytics-card-sub">до конца месяца</span>
                    </div>
                    {analytics.attendance_rate !== null && (
                      <div className="analytics-card">
                        <span className="analytics-card-label">Посещаемость</span>
                        <span className={`analytics-card-value ${analytics.attendance_rate >= 80 ? 'green' : analytics.attendance_rate >= 50 ? 'yellow' : 'red'}`}>
                          {analytics.attendance_rate}%
                        </span>
                        <span className="analytics-card-sub">{analytics.worked_count} из {analytics.planned_count} смен</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            <button className="btn-secondary" onClick={() => { setSubScreen('history'); fetchPastShifts(userId); }}>
              📋 Учёт смен
            </button>
          </div>
        )}

        {/* ИСТОРИЯ СМЕН */}
        {screen === 'profile' && subScreen === 'history' && (
          <div className="screen">
            <div className="screen-header">
              <button className="back-btn" onClick={() => setSubScreen(null)}>← Назад</button>
              <h2 className="screen-title">Учёт смен</h2>
            </div>
            {pastShifts.length === 0 ? (
  <div className="empty">
    <div className="empty-icon">📋</div>
    <span className="empty-title">Смен пока нет</span>
    <span className="empty-subtitle">История появится после первой смены</span>
  </div>
) : (() => {
  const months = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
  const grouped = {};
  pastShifts.forEach(shift => {
    const d = new Date(shift.start_time);
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;
    if (!grouped[month]) grouped[month] = [];
    grouped[month].push(shift);
  });
  return Object.entries(grouped).map(([monthKey, monthShifts]) => {
    const [year, month] = monthKey.split('-');
    const monthEarned = monthShifts.reduce((sum, s) => sum + parseFloat(s.earned || 0), 0);
    const monthHours = monthShifts.reduce((sum, s) => sum + parseFloat(s.hours_worked || 0), 0);
    return (
      <div key={monthKey} className="shifts-month-group">
        <div className="shifts-month-header">
          <span className="shifts-month-label">{months[parseInt(month)-1]} {year}</span>
          <span className="shifts-month-total">{monthHours.toFixed(1)}ч · {monthEarned.toFixed(0)}₽</span>
        </div>
        {monthShifts.map(shift => {
          const start = new Date(shift.start_time);
          const end = new Date(shift.end_time);
          return (
            <div key={shift.id} className="shift-item">
              <div className="shift-date">{start.getDate()}.{String(start.getMonth()+1).padStart(2,'0')}</div>
              <div className="shift-info">
                <span className="shift-time">
                  {String(start.getUTCHours()).padStart(2,'0')}:{String(start.getUTCMinutes()).padStart(2,'0')} — {String(end.getUTCHours()).padStart(2,'0')}:{String(end.getUTCMinutes()).padStart(2,'0')}
                </span>
                <span className="shift-hours">{parseFloat(shift.hours_worked).toFixed(1)}ч</span>
              </div>
              <div className="shift-earned">{shift.earned}₽</div>
            </div>
          );
        })}
      </div>
    );
  });
})()}
          </div>
        )}

        {/* ПОДДЕРЖКА */}
        {screen === 'support' && (
          <div className="screen">
            <h2 className="screen-title">Поддержка</h2>
            <div className="support-card">
              <div className="support-icon">💬</div>
              <p>По всем вопросам обращайтесь:</p>
              <a href={`https://t.me/${config.supportUsername}`} className="support-link">@администратор</a>
              <a href={`https://t.me/${config.developerUsername}`} className="support-link">@разработчик</a>
            </div>
          </div>
        )}

        {/* АДМИН */}
        {screen === 'admin' && isAdmin && !selectedEmployee && (
          <div className="screen">
            <h2 className="screen-title">Управление</h2>
            <div className="admin-tabs">
              <button className={`admin-tab ${adminTab === 'dashboard' ? 'active' : ''}`} onClick={() => { setAdminTab('dashboard'); fetchAdminDashboard(); }}>Сегодня</button>
              <button className={`admin-tab ${adminTab === 'activity' ? 'active' : ''}`} onClick={() => { setAdminTab('activity'); fetchAdminDashboard(); }}>Активность</button>
              <button className={`admin-tab ${adminTab === 'staff' ? 'active' : ''}`} onClick={() => { setAdminTab('staff'); fetchAdminStats(); }}>Штат</button>
            </div>

            {adminTab === 'dashboard' && (
              <div className="dashboard-screen">
                {!adminDashboard ? (
  <div className="skeleton-card">
    <div className="skeleton skeleton-line skeleton-line--short" />
    <div className="skeleton skeleton-line skeleton-line--full" />
    <div className="skeleton skeleton-line skeleton-line--medium" />
  </div>
) : (
  <>
    <div className="dashboard-section">
      <span className="dashboard-section-title">Обзор дня</span>
                      <div className="dashboard-summary">
                        <div className="dashboard-stat green">
                          <span className="dashboard-stat-value">{adminDashboard.summary.on_shift_count}</span>
                          <span className="dashboard-stat-label">На смене</span>
                        </div>
                        <div className="dashboard-stat">
                          <span className="dashboard-stat-value">{adminDashboard.summary.done_today_count}</span>
                          <span className="dashboard-stat-label">Отработали</span>
                        </div>
                        <div className="dashboard-stat red">
                          <span className="dashboard-stat-value">{adminDashboard.summary.not_working_count}</span>
                          <span className="dashboard-stat-label">Не вышли</span>
                        </div>
                      </div>
                    </div>
                    <div className="dashboard-section">
                      <span className="dashboard-section-title">Зарплатный фонд</span>
                      <div className="dashboard-payroll">
                        <div className="payroll-card">
                          <span className="payroll-card-label">Сегодня</span>
                          <span className="payroll-card-value">{adminDashboard.summary.today_payroll.toFixed(0)} ₽</span>
                        </div>
                        <div className="payroll-card">
                          <span className="payroll-card-label">За месяц</span>
                          <span className="payroll-card-value">{adminDashboard.summary.month_payroll.toFixed(0)} ₽</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {adminTab === 'activity' && (
              <div className="dashboard-screen">
                {!adminDashboard ? (
  <div className="skeleton-card">
    <div className="skeleton skeleton-line skeleton-line--short" />
    <div className="skeleton skeleton-line skeleton-line--full" />
    <div className="skeleton skeleton-line skeleton-line--medium" />
  </div>
) : adminDashboard.activity.length === 0 ? (
  <div className="empty">
    <div className="empty-icon">⚡</div>
    <span className="empty-title">Активности пока нет</span>
    <span className="empty-subtitle">Здесь будут появляться события</span>
  </div>
) : (
                    <div className="bank-activity-list">
                      {adminDashboard.activity.map((item, index) => {
                        const isOpen = !item.end_time;
                        const prevItem = adminDashboard.activity[index - 1];
                        const itemDate = new Date(item.end_time || item.start_time);
                        const prevDate = prevItem ? new Date(prevItem.end_time || prevItem.start_time) : null;
                        const showDate = !prevDate || itemDate.toDateString() !== prevDate.toDateString();
                        return (
                          <React.Fragment key={item.id}>
                            {showDate && (
                              <div className="bank-activity-date">
                                {itemDate.getDate() === new Date().getDate() ? 'Сегодня' : `${itemDate.getDate()}.${String(itemDate.getMonth() + 1).padStart(2, '0')}`}
                              </div>
                            )}
                            <div className="bank-activity-item">
                              <div className={`bank-activity-icon ${isOpen ? 'open' : 'close'}`}>{isOpen ? '↑' : '↓'}</div>
                              <div className="bank-activity-info">
                                <span className="bank-activity-name">{item.first_name} {item.last_name}</span>
                                <span className="bank-activity-desc">{isOpen ? 'Открыл смену' : `Закрыл смену · ${item.hours_worked ? parseFloat(item.hours_worked).toFixed(1) : 0}ч`}</span>
                              </div>
                              <div className="bank-activity-right">
                                {!isOpen && <span className="bank-activity-amount">+{parseFloat(item.earned || 0).toFixed(0)} ₽</span>}
                                <span className="bank-activity-time">{formatTime(item.end_time || item.start_time)}</span>
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )
                }
              </div>
            )}

            {adminTab === 'staff' && (
              <div className="staff-list">
                {adminStats.length === 0 ? (
  <div className="empty">
    <div className="empty-icon">👥</div>
    <span className="empty-title">Сотрудников пока нет</span>
    <span className="empty-subtitle">Добавьте первого сотрудника через бота</span>
  </div>
) :
                  adminStats.map(emp => (
                    <div key={emp.id} className="staff-card" onClick={() => { setSelectedEmployee(emp); setEditRate(emp.hourly_rate); setEditWorkplace(emp.workplace); fetchAdminEmpData(emp); }}>
  <div className="admin-avatar">{emp.first_name[0]}{emp.last_name[0]}</div>
  <div className="staff-info">
    <span className="staff-name">{emp.first_name} {emp.last_name}</span>
    <span className="staff-workplace">{emp.workplace}</span>
    <span className="staff-month-stats">{parseFloat(emp.total_hours || 0).toFixed(1)}ч · {parseFloat(emp.total_earned || 0).toFixed(0)}₽ за месяц</span>
  </div>
  <div className="staff-right">
    <span className={`staff-status ${emp.on_shift ? (emp.open_shift?.confirmed_at ? 'on' : 'pending') : 'off'}`}>{emp.on_shift ? (emp.open_shift?.confirmed_at ? 'На смене' : 'Ожидает подтверждения') : 'Не работает'}</span>
  </div>
</div>
                  ))
                }
              </div>
            )}
          </div>
        )}

        {/* ПРОФИЛЬ СОТРУДНИКА (АДМИН) */}
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
                  <div className="info-row"><span className="info-label">Статус</span><span className="info-value">{selectedEmployee.on_shift ? (selectedEmployee.open_shift?.confirmed_at ? '🟢 На смене' : '🟡 Ожидает подтверждения') : '⚪ Не работает'}</span></div>
                </div>
                <button className="btn-secondary" onClick={() => setEditMode(true)}>✏️ Редактировать</button>
                {selectedEmployee.on_shift && (
  <button className="btn-secondary btn-secondary--danger" onClick={async () => {
    await fetch(`${API}/admin/reset-shift/${selectedEmployee.telegram_id}`);
    showMessage('✅ Смена сброшена');
    fetchAdminStats();
    setSelectedEmployee({...selectedEmployee, on_shift: false});
  }}>
    🔄 Сбросить смену
  </button>
)}
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

        {/* ИСТОРИЯ СМЕН (АДМИН) */}
        {screen === 'admin' && subScreen === 'emp-history' && (
          <div className="screen">
            <div className="screen-header">
              <button className="back-btn" onClick={() => setSubScreen(null)}>← Назад</button>
              <h2 className="screen-title">История смен</h2>
            </div>
            {adminEmpShifts.length === 0 ? (
  <div className="empty">
    <div className="empty-icon">📋</div>
    <span className="empty-title">Смен пока нет</span>
    <span className="empty-subtitle">История появится после первой смены</span>
  </div>
) :
              adminEmpShifts.map(shift => {
                const start = new Date(shift.start_time);
                const end = new Date(shift.end_time);
                return (
                  <div key={shift.id} className="shift-item">
                    <div className="shift-date">{start.getDate()}.{String(start.getMonth() + 1).padStart(2, '0')}</div>
                    <div className="shift-info">
                      <span className="shift-time">{String(start.getUTCHours()).padStart(2, '0')}:{String(start.getUTCMinutes()).padStart(2, '0')} — {String(end.getUTCHours()).padStart(2, '0')}:{String(end.getUTCMinutes()).padStart(2, '0')}</span>
                      <span className="shift-hours">{parseFloat(shift.hours_worked).toFixed(1)}ч</span>
                    </div>
                    <div className="shift-earned">{shift.earned}₽</div>
                  </div>
                );
              })
            }
          </div>
        )}

        {/* ПЛАНОВЫЕ СМЕНЫ (АДМИН) */}
{screen === 'admin' && subScreen === 'emp-planned' && (
  <div className="screen">
    <div className="screen-header">
      <button className="back-btn" onClick={() => setSubScreen(null)}>← Назад</button>
      <h2 className="screen-title">Плановые смены</h2>
    </div>

    <div className="shift-form-card">
      <span className="form-section-label">Дата</span>
      <DatePicker
        value={newShift.date}
        onChange={date => setNewShift({...newShift, date})}
      />

      <div className="time-pickers-row">
        <TimePicker
          label="Начало"
          value={newShift.start || '09:00'}
          onChange={start => setNewShift({...newShift, start})}
        />
        <TimePicker
          label="Конец"
          value={newShift.end || '21:00'}
          onChange={end => setNewShift({...newShift, end})}
        />
      </div>

      <div className="form-group">
        <label>Заметка (необязательно)</label>
        <input
          className="form-input"
          value={newShift.note}
          onChange={e => setNewShift({...newShift, note: e.target.value})}
          placeholder="Необязательно"
        />
      </div>

      <button className="action-btn action-btn--open" onClick={addPlannedShift}>
        Добавить смену
      </button>
    </div>

    <div className="shifts-list">
      {adminEmpPlanned.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📅</div>
          <span className="empty-title">Плановых смен нет</span>
          <span className="empty-subtitle">Добавьте смену выше</span>
        </div>
      ) : adminEmpPlanned.map(shift => (
         <div key={shift.id} id={`shift-${shift.id}`} className="shift-item">
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
        <button className={`nav-item ${screen === 'profile' ? 'active' : ''}`} onClick={() => { navigateTo('profile'); fetchAnalytics(userId); }}>
          <span className="nav-icon">👤</span>
          <span className="nav-label">Профиль</span>
        </button>
        <button className={`nav-item ${screen === 'support' ? 'active' : ''}`} onClick={() => navigateTo('support')}>
          <span className="nav-icon">💬</span>
          <span className="nav-label">Поддержка</span>
        </button>
        {isAdmin && (
          <button className={`nav-item ${screen === 'admin' ? 'active' : ''}`} onClick={() => { navigateTo('admin'); fetchAdminDashboard(); }}>
            <span className="nav-icon">⚙️</span>
            <span className="nav-label">Админ</span>
          </button>
        )}
      </nav>
    </div>
  );
}

export default App;