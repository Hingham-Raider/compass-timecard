import { useState, useEffect } from "react";
import { supabase } from "./supabase";

// ─── SYSTEM4 BRAND ────────────────────────────────────────────────
// Colors from official System4 Brand Guidelines (062419)
// Blue  CMYK 90, 56, 5, 0  → #196dae
// Red   CMYK 14,100,91, 4  → #D20016  (logo accent / callout)
// Text  80% black          → #333333
// Font  Avenir family → Nunito Sans (closest Google Fonts equivalent)
const B = {
  primary:     "#196dae",   // System4 blue
  primaryDark: "#145d94",   // Darker blue for headers
  primaryHover:"#188dbf",   // Hover/active blue
  red:         "#D20016",   // System4 red (logo accent, callouts)
  light:       "#e8f3fb",   // Light blue tint
  lightBorder: "#c5dff0",   // Light blue border
  text:        "#333333",   // 80% black body text
  font:        "'Nunito Sans', sans-serif",  // Avenir substitute
};

const MANAGER_PASSWORD = "Clean123"; // Replace with Supabase Auth in production

const SHIFTS = [
  { id: "1", name: "1st Shift", time: "7AM-3PM"   },
  { id: "2", name: "2nd Shift", time: "3PM-11PM"  },
  { id: "3", name: "3rd Shift", time: "11PM-7AM"  },
];

// Demo data spanning multiple days for export to be meaningful
const initialCards = [
  { id: 1,  name: "Maria Garcia",  shift: "Shift 1", date: "2026-03-22", startTime: "06:00", endTime: "14:00", status: "pending",  submittedAt: "2026-03-22T14:05:00", approvedBy: null,         approvedAt: null },
  { id: 2,  name: "James Wilson",  shift: "Shift 2", date: "2026-03-22", startTime: "14:00", endTime: "22:00", status: "pending",  submittedAt: "2026-03-22T22:10:00", approvedBy: null,         approvedAt: null },
  { id: 3,  name: "Sofia Chen",    shift: "Shift 3", date: "2026-03-21", startTime: "22:00", endTime: "06:00", status: "approved", submittedAt: "2026-03-22T06:15:00", approvedBy: "John Smith", approvedAt: "2026-03-22T08:00:00" },
  { id: 4,  name: "David Reyes",   shift: "Shift 1", date: "2026-03-21", startTime: "06:00", endTime: "14:30", status: "rejected", submittedAt: "2026-03-21T15:00:00", approvedBy: "John Smith", approvedAt: "2026-03-21T16:00:00" },
  { id: 5,  name: "Maria Garcia",  shift: "Shift 1", date: "2026-03-21", startTime: "06:00", endTime: "14:00", status: "approved", submittedAt: "2026-03-21T14:10:00", approvedBy: "John Smith", approvedAt: "2026-03-21T15:00:00" },
  { id: 6,  name: "James Wilson",  shift: "Shift 2", date: "2026-03-20", startTime: "14:00", endTime: "22:00", status: "approved", submittedAt: "2026-03-20T22:05:00", approvedBy: "John Smith", approvedAt: "2026-03-21T09:00:00" },
  { id: 7,  name: "Sofia Chen",    shift: "Shift 3", date: "2026-03-20", startTime: "22:00", endTime: "06:00", status: "approved", submittedAt: "2026-03-21T06:20:00", approvedBy: "John Smith", approvedAt: "2026-03-21T09:05:00" },
  { id: 8,  name: "Lisa Nguyen",   shift: "Shift 1", date: "2026-03-19", startTime: "06:00", endTime: "14:00", status: "approved", submittedAt: "2026-03-19T14:08:00", approvedBy: "John Smith", approvedAt: "2026-03-19T16:00:00" },
  { id: 9,  name: "Maria Garcia",  shift: "Shift 1", date: "2026-03-18", startTime: "06:00", endTime: "14:00", status: "approved", submittedAt: "2026-03-18T14:10:00", approvedBy: "John Smith", approvedAt: "2026-03-18T15:00:00" },
  { id: 10, name: "David Reyes",   shift: "Shift 2", date: "2026-03-17", startTime: "14:00", endTime: "22:00", status: "approved", submittedAt: "2026-03-17T22:15:00", approvedBy: "John Smith", approvedAt: "2026-03-18T08:00:00" },
  { id: 11, name: "Lisa Nguyen",   shift: "Shift 3", date: "2026-03-10", startTime: "22:00", endTime: "06:00", status: "approved", submittedAt: "2026-03-11T06:30:00", approvedBy: "John Smith", approvedAt: "2026-03-11T09:00:00" },
  { id: 12, name: "James Wilson",  shift: "Shift 1", date: "2026-03-05", startTime: "06:00", endTime: "14:30", status: "approved", submittedAt: "2026-03-05T14:35:00", approvedBy: "John Smith", approvedAt: "2026-03-05T16:00:00" },
];

// ─── HELPERS ──────────────────────────────────────────────────────
const formatTime = (t) => {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

const calcHours = (start, end) => {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  return parseFloat((diff / 60).toFixed(1));
};

const formatDateShort = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

const getPeriodCards = (cards, period) => {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  if (period === "day") return cards.filter(c => c.date === todayStr);
  if (period === "week") {
    const dow = now.getDay();
    const sun = new Date(now); sun.setDate(now.getDate() - dow); sun.setHours(0,0,0,0);
    const sat = new Date(sun); sat.setDate(sun.getDate() + 6); sat.setHours(23,59,59,999);
    return cards.filter(c => { const d = new Date(c.date); return d >= sun && d <= sat; });
  }
  if (period === "month") {
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return cards.filter(c => c.date.startsWith(prefix));
  }
  return cards;
};

const getPeriodLabel = (period) => {
  const now = new Date();
  if (period === "day") return now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  if (period === "week") {
    const dow = now.getDay();
    const sun = new Date(now); sun.setDate(now.getDate() - dow);
    const sat = new Date(sun); sat.setDate(sun.getDate() + 6);
    return `${sun.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${sat.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }
  if (period === "month") return now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return "All Time";
};

const getSummary = (cards) => {
  const map = {};
  cards.forEach(c => {
    if (!map[c.name]) map[c.name] = { name: c.name, totalHours: 0, cards: 0, approved: 0, pending: 0, rejected: 0, shifts: {} };
    map[c.name].totalHours += calcHours(c.startTime, c.endTime);
    map[c.name].cards++;
    map[c.name][c.status]++;
    map[c.name].shifts[c.shift] = (map[c.name].shifts[c.shift] || 0) + 1;
  });
  return Object.values(map).sort((a, b) => b.totalHours - a.totalHours)
    .map(e => ({ ...e, totalHours: parseFloat(e.totalHours.toFixed(1)) }));
};

const downloadCSV = (cards, periodLabel) => {
  const headers = ["Name", "Shift", "Date", "Start Time", "End Time", "Hours Worked", "Status", "Approved By", "Approved At"];
  const rows = cards.map(c => [
    `"${c.name}"`, `"${c.shift}"`, `"${c.date}"`,
    `"${formatTime(c.startTime)}"`, `"${formatTime(c.endTime)}"`,
    calcHours(c.startTime, c.endTime),
    `"${c.status}"`, `"${c.approvedBy || ""}"`, `"${c.approvedAt ? formatDateShort(c.approvedAt) : ""}"`,
  ]);
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const filename = `CompassHospital-Timecards-${periodLabel.replace(/[^a-z0-9]/gi, "-")}-${new Date().toISOString().split("T")[0]}.csv`;
  const uri = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  const a = document.createElement("a");
  a.href = uri; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
};

// ─── SVG ICONS ────────────────────────────────────────────────────
// System4Mark removed — replaced with Compass Hospital branding

function IconPerson() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  );
}
function IconClipboard() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 14l2 2 4-4"/>
    </svg>
  );
}
function IconLock() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function IconDownload() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}
function IconInbox() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
    </svg>
  );
}
function IconClock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}
function IconChevronRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}
function IconChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  );
}

// ─── STATUS BADGE ─────────────────────────────────────────────────
function StatusBadge({ status }) {
  const styles = {
    pending:  "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-600",
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${styles[status] || ""}`}
      style={{ fontFamily: B.font }}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── SHARED HEADER ────────────────────────────────────────────────
function AppHeader({ title, subtitle, onBack, dark }) {
  return (
    <div className="text-white sticky top-0 z-10 shadow-md"
      style={{ backgroundColor: dark ? B.primaryDark : B.primary, fontFamily: B.font }}>
      {/* Red accent stripe mirrors System4 logo */}
      <div className="h-1 w-full" style={{ backgroundColor: B.red }}/>
      <div className="px-4 py-4 flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="opacity-70 hover:opacity-100 transition px-1 py-1 -ml-1">
            <IconChevronLeft />
          </button>
        )}
        <div className="flex-1">
          <h1 className="font-bold text-lg leading-tight">{title}</h1>
          {subtitle && <p className="text-xs opacity-60 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── PRIMARY BUTTON ───────────────────────────────────────────────
function PrimaryBtn({ children, onClick, type = "button", disabled, className = "", color }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`w-full text-white font-bold py-4 rounded-xl transition text-base shadow-md disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      style={{ backgroundColor: disabled ? "#aaa" : (color || B.primary), fontFamily: B.font }}>
      {children}
    </button>
  );
}

// ─── HOME SCREEN ──────────────────────────────────────────────────
function HomeScreen({ onSelect }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: `linear-gradient(135deg, ${B.primaryDark} 0%, ${B.primary} 60%, ${B.primaryHover} 100%)`, fontFamily: B.font }}>

      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2" style={{ fontFamily: B.font }}>
          Compass Hospital
        </h1>
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.45)", fontFamily: B.font }}>
          Time Card Management
        </p>
      </div>

      <div className="w-full max-w-xs space-y-4">
        {/* Cleaner button */}
        <button onClick={() => onSelect("cleaner")}
          className="w-full bg-white py-5 px-5 rounded-2xl shadow-xl transition-all flex items-center gap-4 active:scale-95"
          style={{ fontFamily: B.font }}>
          <div className="flex-shrink-0" style={{ color: B.primary }}><IconPerson /></div>
          <div className="text-left flex-1">
            <div className="font-bold text-base" style={{ color: B.primaryDark }}>Commercial Cleaner</div>
            <div className="text-sm text-gray-400 font-normal">Submit my time card</div>
          </div>
          <div className="text-gray-300"><IconChevronRight /></div>
        </button>

        {/* Manager button */}
        <button onClick={() => onSelect("manager")}
          className="w-full py-5 px-5 rounded-2xl shadow-xl transition-all flex items-center gap-4 active:scale-95"
          style={{ backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", fontFamily: B.font }}>
          <div className="text-white flex-shrink-0"><IconClipboard /></div>
          <div className="text-left flex-1">
            <div className="font-bold text-base text-white">Manager Approval</div>
            <div className="text-sm font-normal" style={{ color: "rgba(255,255,255,0.6)" }}>Review, approve &amp; export</div>
          </div>
          <div style={{ color: "rgba(255,255,255,0.5)" }}><IconChevronRight /></div>
        </button>
      </div>

      <p className="mt-10 text-xs" style={{ color: "rgba(255,255,255,0.4)", fontFamily: B.font }}>
        Compass Hospital © 2026
      </p>
    </div>
  );
}

// ─── CLEANER SCREEN ───────────────────────────────────────────────
function CleanerScreen({ onBack, onSubmit }) {
  const [name, setName]           = useState("");
  const [shift, setShift]         = useState("");
  const [date, setDate]           = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime]     = useState("");
  const [error, setError]         = useState("");
  const [done, setDone]           = useState(false);
  const hours = calcHours(startTime, endTime);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!shift) { setError("Please select a shift."); return; }
    setError("");
    onSubmit({ name, shift, date, startTime, endTime, status: "pending", submittedAt: new Date().toISOString(), approvedBy: null, approvedAt: null });
    setDone(true);
  };

  const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-800 outline-none transition";
  const inputStyle = { fontFamily: B.font };

  if (done) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-5" style={{ fontFamily: B.font }}>
      <div className="bg-white rounded-2xl shadow-lg p-7 w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-white"
          style={{ backgroundColor: B.primary }}>
          <IconCheck />
        </div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: B.text }}>Submitted!</h2>
        <p className="text-gray-400 text-sm mb-6">Awaiting manager approval.</p>
        <div className="rounded-xl p-4 mb-6 space-y-2.5 text-left" style={{ backgroundColor: B.light }}>
          {[["Name", name], ["Shift", shift], ["Date", date], ["Time", `${formatTime(startTime)} – ${formatTime(endTime)}`], ["Hours", `${hours} hrs`]].map(([l, v]) => (
            <div key={l} className="flex justify-between text-sm">
              <span className="text-gray-400">{l}</span>
              <span className="font-semibold" style={{ color: B.primaryDark }}>{v}</span>
            </div>
          ))}
        </div>
        <PrimaryBtn onClick={() => setDone(false)} className="mb-3">Submit Another</PrimaryBtn>
        <button onClick={onBack} className="w-full text-gray-400 text-sm py-2 hover:text-gray-600 transition" style={{ fontFamily: B.font }}>
          Back to Home
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: B.font }}>
      <AppHeader title="Submit Time Card" subtitle="Compass Hospital" onBack={onBack} />

      <form onSubmit={handleSubmit} className="p-4 max-w-md mx-auto space-y-4 pb-12">

        {/* Name */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="Enter your name" required autoComplete="name"
            className={inputCls} style={inputStyle} />
        </div>

        {/* Shift */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Select Shift</label>
          <div className="grid grid-cols-3 gap-2">
            {SHIFTS.map(s => (
              <button key={s.id} type="button" onClick={() => { setShift(s.name); setError(""); }}
                className="py-4 px-2 rounded-xl border-2 text-center transition-all"
                style={shift === s.name
                  ? { backgroundColor: B.primary, borderColor: B.primary, color: "white" }
                  : { backgroundColor: "white", borderColor: "#e5e7eb", color: "#4b5563" }}>
                <div className="font-bold text-sm">{s.name}</div>
                <div className="text-xs mt-1" style={{ opacity: 0.7 }}>{s.time}</div>
              </button>
            ))}
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>

        {/* Date */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} required
            className={inputCls} style={inputStyle} />
        </div>

        {/* Times */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Work Hours</label>
          <div className="grid grid-cols-2 gap-3">
            {[["Start Time", startTime, setStartTime], ["End Time", endTime, setEndTime]].map(([label, val, setter]) => (
              <div key={label}>
                <label className="text-xs text-gray-400 block mb-2">{label}</label>
                <input type="time" value={val} onChange={e => setter(e.target.value)} required
                  className={inputCls} style={inputStyle} />
              </div>
            ))}
          </div>
          {startTime && endTime && (
            <div className="mt-3 rounded-xl py-3 text-center" style={{ backgroundColor: B.light }}>
              <span className="font-bold text-xl" style={{ color: B.primary }}>{hours}</span>
              <span className="text-sm ml-1" style={{ color: B.primaryHover }}>hours total</span>
            </div>
          )}
        </div>

        <PrimaryBtn type="submit" color={B.red} disabled={!name || !shift || !date || !startTime || !endTime}>
          Submit Time Card
        </PrimaryBtn>
      </form>
    </div>
  );
}

// ─── MANAGER LOGIN ────────────────────────────────────────────────
function ManagerLogin({ onBack, onLogin }) {
  const [name, setName]         = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === MANAGER_PASSWORD) { onLogin(name); }
    else { setError("Incorrect password. Please try again."); }
  };

  const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-3 text-base outline-none transition";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ fontFamily: B.font }}>
      <AppHeader title="Manager Login" subtitle="Compass Hospital" onBack={onBack} dark />
      <div className="flex-1 flex items-center justify-center p-5">
        <div className="bg-white rounded-2xl shadow-lg p-7 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 text-white"
              style={{ backgroundColor: B.primary }}>
              <IconLock />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Manager Access</h2>
            <p className="text-gray-400 text-sm mt-1">Sign in to review time cards</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Your Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. John Smith" required
                className={inputCls} style={{ fontFamily: B.font }} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(""); }}
                placeholder="Enter password" required autoComplete="new-password"
                className={inputCls} style={{ fontFamily: B.font }} />
              {error && <p className="text-red-500 text-sm mt-1.5">{error}</p>}
            </div>
            <PrimaryBtn type="submit">Sign In</PrimaryBtn>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── EXPORT PANEL ─────────────────────────────────────────────────
function ExportPanel({ timeCards }) {
  const [period, setPeriod]           = useState("week");
  const [statusFilter, setStatusFilter] = useState("all");

  const periodLabel   = getPeriodLabel(period);
  const periodCards   = getPeriodCards(timeCards, period);
  const filteredCards = statusFilter === "all" ? periodCards : periodCards.filter(c => c.status === statusFilter);
  const summary       = getSummary(periodCards);
  const totalHours    = summary.reduce((sum, e) => sum + e.totalHours, 0).toFixed(1);
  const approvedCards = periodCards.filter(c => c.status === "approved");
  const approvedHours = getSummary(approvedCards).reduce((sum, e) => sum + e.totalHours, 0).toFixed(1);

  const PERIODS = [
    { key: "day",   label: "Today"      },
    { key: "week",  label: "This Week"  },
    { key: "month", label: "This Month" },
    { key: "all",   label: "All Time"   },
  ];

  const pillActive   = { backgroundColor: B.primary, color: "white", borderColor: B.primary };
  const pillInactive = { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" };

  return (
    <div className="p-4 max-w-2xl mx-auto pb-12" style={{ fontFamily: B.font }}>

      {/* Period selector */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: B.red }}>Select Period</p>
        <div className="grid grid-cols-2 gap-2">
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className="py-3 px-3 rounded-xl border-2 font-semibold text-sm text-center transition-all"
              style={period === p.key ? pillActive : pillInactive}>
              {p.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 text-center mt-3">{periodLabel}</p>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl p-4 text-center" style={{ backgroundColor: B.light, border: `1px solid ${B.lightBorder}` }}>
          <div className="text-3xl font-extrabold" style={{ color: B.primary }}>{totalHours}</div>
          <div className="text-xs font-medium mt-0.5" style={{ color: B.primaryHover }}>Total Hours</div>
          <div className="text-xs text-gray-400 mt-1">{periodCards.length} cards submitted</div>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
          <div className="text-3xl font-extrabold text-green-700">{approvedHours}</div>
          <div className="text-xs text-green-500 font-medium mt-0.5">Approved Hours</div>
          <div className="text-xs text-green-300 mt-1">{approvedCards.length} cards approved</div>
        </div>
      </div>

      {/* Employee summary */}
      {summary.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm mb-4 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-700">Employee Summary</p>
            <p className="text-xs text-gray-400">{periodLabel}</p>
          </div>
          {summary.map((emp, i) => (
            <div key={emp.name} className={`px-4 py-3 flex items-center gap-3 ${i < summary.length - 1 ? "border-b border-gray-100" : ""}`}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
                style={{ backgroundColor: B.primary }}>
                {emp.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-800 text-sm truncate">{emp.name}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.entries(emp.shifts).map(([sh, count]) => (
                    <span key={sh} className="text-xs px-1.5 py-0.5 rounded font-medium"
                      style={{ backgroundColor: B.light, color: B.primary }}>
                      {sh} ×{count}
                    </span>
                  ))}
                </div>
                <div className="flex gap-3 mt-1">
                  {emp.approved > 0 && <span className="text-xs text-green-500">{emp.approved} approved</span>}
                  {emp.pending  > 0 && <span className="text-xs text-yellow-500">{emp.pending} pending</span>}
                  {emp.rejected > 0 && <span className="text-xs text-red-400">{emp.rejected} rejected</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-lg font-extrabold text-gray-800">
                  {emp.totalHours}<span className="text-xs font-normal text-gray-400">h</span>
                </div>
                <div className="text-xs text-gray-400">{emp.cards} {emp.cards === 1 ? "shift" : "shifts"}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 text-gray-300 bg-white rounded-xl shadow-sm mb-4">
          <div className="flex justify-center mb-2 opacity-30"><IconInbox /></div>
          <p className="text-sm">No time cards for this period</p>
        </div>
      )}

      {/* Status filter + download */}
      {summary.length > 0 && (
        <>
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: B.red }}>Export Filter</p>
            <div className="flex gap-2 flex-wrap">
              {["all", "approved", "pending", "rejected"].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className="px-4 py-2 rounded-full text-sm font-medium transition-all border"
                  style={statusFilter === s ? pillActive : pillInactive}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {filteredCards.length} record{filteredCards.length !== 1 ? "s" : ""} will be exported
            </p>
          </div>

          <button onClick={() => downloadCSV(filteredCards, periodLabel)} disabled={filteredCards.length === 0}
            className="w-full text-white font-bold py-4 rounded-xl transition shadow-lg flex items-center justify-center gap-2 text-base disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: B.primary, fontFamily: B.font }}>
            <IconDownload />
            Download CSV — {filteredCards.length} Record{filteredCards.length !== 1 ? "s" : ""}
          </button>
          <p className="text-center text-xs text-gray-400 mt-2">Opens in Excel, Google Sheets, or any spreadsheet app</p>
        </>
      )}
    </div>
  );
}

// ─── TIME CARD ITEM ───────────────────────────────────────────────
function TimeCardItem({ card, onApprove, onReject, onDelete }) {
  const hours = calcHours(card.startTime, card.endTime);
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" style={{ fontFamily: B.font }}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-bold text-gray-800 text-base">{card.name}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ backgroundColor: B.light, color: B.primary }}>
                {card.shift}
              </span>
              <span className="text-xs text-gray-400">{card.date}</span>
            </div>
          </div>
          <StatusBadge status={card.status} />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center mb-3">
          {[
            ["Start", formatTime(card.startTime), { backgroundColor: "#f9fafb", color: "#374151" }],
            ["End",   formatTime(card.endTime),   { backgroundColor: "#f9fafb", color: "#374151" }],
            ["Hours", `${hours}h`,                { backgroundColor: B.light,  color: B.primary  }],
          ].map(([label, val, style]) => (
            <div key={label} className="rounded-xl p-2" style={style}>
              <div className="text-xs text-gray-400 mb-0.5">{label}</div>
              <div className="font-semibold text-sm">{val}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1 text-gray-300 mb-3">
          <IconClock />
          <p className="text-xs">Submitted {formatDateShort(card.submittedAt)}</p>
        </div>

        {card.status === "pending" && (
          <div className="flex gap-2">
            <button onClick={() => onApprove(card.id)}
              className="flex-1 text-white font-semibold py-3 rounded-xl transition text-sm"
              style={{ backgroundColor: "#16a34a", fontFamily: B.font }}>
              Approve
            </button>
            <button onClick={() => onReject(card.id)}
              className="flex-1 text-white font-semibold py-3 rounded-xl transition text-sm"
              style={{ backgroundColor: "#dc2626", fontFamily: B.font }}>
              Reject
            </button>
          </div>
        )}
        {card.status !== "pending" && card.approvedBy && (
          <div className={`text-xs px-3 py-2 rounded-lg ${card.status === "approved" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
            {card.status === "approved" ? "Approved" : "Rejected"} by <strong>{card.approvedBy}</strong> · {formatDateShort(card.approvedAt)}
          </div>
        )}
        {card.status === "rejected" && onDelete && (
          <button
            onClick={() => { if (window.confirm("Delete this rejected time card? This cannot be undone.")) onDelete(card.id); }}
            className="w-full text-white font-semibold py-2 rounded-xl transition text-sm mt-1"
            style={{ backgroundColor: "#6b7280", fontFamily: B.font }}>
            🗑 Delete Card
          </button>
        )}
      </div>
    </div>
  );
}

// ─── MANAGER DASHBOARD ────────────────────────────────────────────
function ManagerDashboard({ timeCards, managerName, onApprove, onReject, onDelete, onSignOut }) {
  const [tab, setTab]               = useState("cards");
  const [statusFilter, setStatusFilter] = useState("pending");

  const counts = {
    pending:  timeCards.filter(c => c.status === "pending").length,
    approved: timeCards.filter(c => c.status === "approved").length,
    rejected: timeCards.filter(c => c.status === "rejected").length,
  };
  const filtered = timeCards.filter(c => statusFilter === "all" ? true : c.status === statusFilter);

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: B.font }}>
      {/* Header */}
      <div className="text-white sticky top-0 z-10 shadow-md" style={{ backgroundColor: B.primaryDark }}>
        {/* Red accent stripe — matches System4 logo red swoosh */}
        <div className="h-1 w-full" style={{ backgroundColor: B.red }}/>
        <div className="px-4 py-4 flex items-center justify-between max-w-2xl mx-auto">
          <div>
            <h1 className="font-bold text-lg leading-tight">Manager Dashboard</h1>
            <p className="text-xs opacity-60 mt-0.5">Welcome, {managerName}</p>
          </div>
          <button onClick={onSignOut}
            className="text-sm px-3 py-2 rounded-xl transition font-medium"
            style={{ border: "1px solid rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.8)", fontFamily: B.font }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-10">
        <div className="flex max-w-2xl mx-auto">
          {[
            { key: "cards",  label: "Time Cards", badge: counts.pending },
            { key: "export", label: "Export",     badge: null },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex-1 py-3.5 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all"
              style={tab === t.key
                ? { borderBottomColor: B.primary, color: B.primary }
                : { borderBottomColor: "transparent", color: "#9ca3af" }}>
              {t.label}
              {t.badge !== null && t.badge > 0 && (
                <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* TIME CARDS TAB */}
      {tab === "cards" && (
        <div className="p-4 max-w-2xl mx-auto">
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { key: "pending",  label: "Pending",  bg: "#fefce8", border: "#fde68a", text: "#92400e" },
              { key: "approved", label: "Approved", bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" },
              { key: "rejected", label: "Rejected", bg: "#fef2f2", border: "#fecaca", text: "#dc2626" },
            ].map(s => (
              <button key={s.key} onClick={() => setStatusFilter(s.key)}
                className="rounded-xl p-3 text-center transition-all"
                style={{
                  backgroundColor: s.bg,
                  border: `1px solid ${s.border}`,
                  color: s.text,
                  outline: statusFilter === s.key ? `2px solid ${B.primary}` : "none",
                  outlineOffset: "2px",
                }}>
                <div className="text-2xl font-extrabold leading-tight">{counts[s.key]}</div>
                <div className="text-xs font-medium mt-0.5">{s.label}</div>
              </button>
            ))}
          </div>

          {/* Filter pills */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {["all", "pending", "approved", "rejected"].map(f => (
              <button key={f} onClick={() => setStatusFilter(f)}
                className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border"
                style={statusFilter === f
                  ? { backgroundColor: B.primary, color: "white", borderColor: B.primary }
                  : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Card list */}
          <div className="space-y-3 pb-8">
            {filtered.length === 0 ? (
              <div className="text-center py-14 text-gray-300">
                <div className="flex justify-center mb-3 opacity-40"><IconInbox /></div>
                <p className="text-sm">No time cards to show</p>
              </div>
            ) : filtered.map(card => (
              <TimeCardItem key={card.id} card={card} onApprove={onApprove} onReject={onReject} onDelete={onDelete} />
            ))}
          </div>
        </div>
      )}

      {/* EXPORT TAB */}
      {tab === "export" && <ExportPanel timeCards={timeCards} />}
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────
export default function App() {
  const [view, setView]             = useState("home");
  const [timeCards, setTimeCards]   = useState([]);
  const [managerName, setManagerName] = useState("");

  // Inject Nunito Sans (Avenir substitute per System4 brand guidelines)
  useEffect(() => {
    const id = "system4-font";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id   = id;
      link.rel  = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300;400;600;700;800&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  // Load timecards from Supabase on mount
  useEffect(() => {
    const loadCards = async () => {
      const { data, error } = await supabase
        .from("timecards")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) {
        setTimeCards(data.map(r => ({
          id: r.id,
          name: r.cleaner_name,
          shift: r.shift,
          date: r.date,
          startTime: r.start_time,
          endTime: r.end_time,
          status: r.status || "pending",
          submittedAt: r.created_at,
          approvedBy: r.approved_by,
          approvedAt: r.approved_at,
        })));
      }
    };
    loadCards();

    // Real-time subscription
    const channel = supabase.channel("timecards-channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "timecards" }, () => {
        loadCards();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const handleSubmitCard = async (card) => {
    const { data, error } = await supabase.from("timecards").insert({
      cleaner_name: card.name,
      shift: card.shift,
      date: card.date,
      start_time: card.startTime,
      end_time: card.endTime,
      status: "pending",
    }).select().single();
    if (!error && data) {
      setTimeCards(prev => [{
        id: data.id, name: data.cleaner_name, shift: data.shift,
        date: data.date, startTime: data.start_time, endTime: data.end_time,
        status: data.status, submittedAt: data.created_at,
        approvedBy: null, approvedAt: null,
      }, ...prev]);
    }
  };

  const handleApprove = async (id) => {
    const now = new Date().toISOString();
    await supabase.from("timecards").update({ status: "approved", approved_by: managerName, approved_at: now }).eq("id", id);
    setTimeCards(prev => prev.map(c => c.id === id ? { ...c, status: "approved", approvedBy: managerName, approvedAt: now } : c));
  };

  const handleReject = async (id) => {
    const now = new Date().toISOString();
    await supabase.from("timecards").update({ status: "rejected", approved_by: managerName, approved_at: now }).eq("id", id);
    setTimeCards(prev => prev.map(c => c.id === id ? { ...c, status: "rejected", approvedBy: managerName, approvedAt: now } : c));
  };

  const handleDelete = async (id) => {
    await supabase.from("timecards").delete().eq("id", id);
    setTimeCards(prev => prev.filter(c => c.id !== id));
  };

  if (view === "home")    return <HomeScreen onSelect={setView} />;
  if (view === "cleaner") return <CleanerScreen onBack={() => setView("home")} onSubmit={handleSubmitCard} />;
  if (view === "manager") return <ManagerLogin  onBack={() => setView("home")} onLogin={(n) => { setManagerName(n); setView("dashboard"); }} />;
  if (view === "dashboard") return (
    <ManagerDashboard timeCards={timeCards} managerName={managerName}
      onApprove={handleApprove} onReject={handleReject} onDelete={handleDelete}
      onSignOut={() => { setManagerName(""); setView("home"); }} />
  );
  return null;
}
