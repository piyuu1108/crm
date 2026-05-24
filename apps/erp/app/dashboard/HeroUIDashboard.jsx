import { useState } from "react";
import {
  LayoutDashboard, ShoppingBag, ListChecks, BarChart2, Settings,
  HelpCircle, LogOut, RefreshCw, CalendarDays, Download,
  Search, Bell, UserPlus, Filter, ArrowUpDown, Columns,
  Eye, Pencil, Trash2, Copy, TrendingUp, TrendingDown, ChevronDown, X
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from "recharts";

const salesData = [
  { month: "01", value: 38 }, { month: "02", value: 45 },
  { month: "03", value: 28 }, { month: "04", value: 20 },
  { month: "05", value: 50 }, { month: "06", value: 42 },
  { month: "07", value: 35 }, { month: "08", value: 55 },
  { month: "09", value: 30 }, { month: "10", value: 48 },
  { month: "11", value: 22 }, { month: "12", value: 44 },
];

const trafficData = [
  { month: "Jan", organic: 5000, paid: 3000 },
  { month: "Feb", organic: 8000, paid: 5000 },
  { month: "Mar", organic: 6000, paid: 7000 },
  { month: "Apr", organic: 9000, paid: 6000 },
  { month: "May", organic: 12000, paid: 8000 },
  { month: "Jun", organic: 10000, paid: 9000 },
  { month: "Jul", organic: 14000, paid: 11000 },
  { month: "Aug", organic: 13000, paid: 12000 },
  { month: "Sep", organic: 16000, paid: 10000 },
  { month: "Oct", organic: 18000, paid: 14000 },
  { month: "Nov", organic: 17000, paid: 16000 },
  { month: "Dec", organic: 19000, paid: 15000 },
];

const employees = [
  { id: "#4586936", name: "Alex Turner", email: "alex@acme.com", role: "Product Manager", type: "Employee", avatar: "AT", color: "#6366f1" },
  { id: "#4586937", name: "Emma Davis", email: "emma@acme.com", role: "Senior Designer", type: "Employee", avatar: "ED", color: "#ec4899" },
  { id: "#4586933", name: "John Smith", email: "john@acme.com", role: "Chief Technology Officer", type: "Employee", avatar: "JS", color: "#14b8a6" },
  { id: "#4586932", name: "Kate Moore", email: "kate@acme.com", role: "Chief Executive Officer", type: "Employee", avatar: "KM", color: "#a78bfa" },
  { id: "#4586935", name: "Mike Wilson", email: "mike@acme.com", role: "VP of Engineering", type: "Employee", avatar: "MW", color: "#22c55e" },
  { id: "#4586934", name: "Sara Johnson", email: "sara@acme.com", role: "Chief Marketing Officer", type: "Employee", avatar: "SJ", color: "#10b981" },
];

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: ShoppingBag, label: "Orders", active: false },
  { icon: ListChecks, label: "Tracker", active: false, badge: "New" },
  { icon: BarChart2, label: "Analytics", active: false },
  { icon: Settings, label: "Settings", active: false },
];

const statCards = [
  { label: "Revenue", value: "US$228,441", change: "+3.3%", positive: true },
  { label: "Expenses", value: "US$25,108", change: "+3.3%", positive: false },
  { label: "Sales", value: "458", change: "+3.3%", positive: true },
  { label: "Profit", value: "US$203,133", change: "+4.1%", positive: true },
];

const CustomBar = (props) => {
  const { x, y, width, height } = props;
  const radius = 4;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={radius} ry={radius}
        fill="url(#barGrad)" />
    </g>
  );
};

export default function HeroUIDashboard() {
  const [activeTab, setActiveTab] = useState("Overview");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f4f4f5", fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 14, color: "#111" }}>

      {/* Sidebar */}
      <aside style={{
        width: 200, background: "#fff", display: "flex", flexDirection: "column",
        borderRight: "1px solid #e4e4e7", flexShrink: 0, padding: "20px 0"
      }}>
        {/* User */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 16px 20px" }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#a5b4fc,#818cf8)",
            display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13
          }}>KM</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.2 }}>Kate Moore</div>
            <div style={{ fontSize: 11, color: "#71717a" }}>Admin</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "0 8px" }}>
          {navItems.map(({ icon: Icon, label, active, badge }) => (
            <div key={label} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
              borderRadius: 10, cursor: "pointer", marginBottom: 2,
              background: active ? "#f4f4f5" : "transparent",
              color: active ? "#111" : "#52525b", fontWeight: active ? 600 : 500,
              transition: "background 0.15s"
            }}>
              <Icon size={16} strokeWidth={1.8} />
              <span style={{ flex: 1, fontSize: 13 }}>{label}</span>
              {badge && (
                <span style={{
                  fontSize: 10, fontWeight: 700, background: "#18181b", color: "#fff",
                  padding: "1px 6px", borderRadius: 20
                }}>{badge}</span>
              )}
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div style={{ padding: "0 8px", borderTop: "1px solid #f4f4f5", paddingTop: 12 }}>
          {[{ icon: HelpCircle, label: "Help & Information" }, { icon: LogOut, label: "Log out" }].map(({ icon: Icon, label }) => (
            <div key={label} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
              borderRadius: 10, cursor: "pointer", color: "#71717a", fontSize: 13, fontWeight: 500
            }}>
              <Icon size={15} strokeWidth={1.8} />
              {label}
            </div>
          ))}
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Topbar */}
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 24px", background: "#fff", borderBottom: "1px solid #e4e4e7"
        }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Good morning, Kate</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button style={{ background: "none", border: "none", cursor: "pointer", color: "#71717a", padding: 4 }}>
              <Search size={18} />
            </button>
            <button style={{ background: "none", border: "none", cursor: "pointer", color: "#71717a", padding: 4, position: "relative" }}>
              <Bell size={18} />
              <span style={{ position: "absolute", top: 2, right: 2, width: 7, height: 7, background: "#3b82f6", borderRadius: "50%", border: "1.5px solid #fff" }} />
            </button>
            <button style={{
              display: "flex", alignItems: "center", gap: 6, background: "#3b82f6", color: "#fff",
              border: "none", borderRadius: 10, padding: "7px 14px", cursor: "pointer", fontWeight: 600, fontSize: 13
            }}>
              <UserPlus size={14} /> Invite
            </button>
          </div>
        </header>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>

          {/* Tabs + Actions */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div style={{ display: "flex", gap: 2, background: "#f4f4f5", borderRadius: 10, padding: 3 }}>
              {["Overview", "Sales", "Expenses"].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  padding: "5px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13,
                  background: activeTab === tab ? "#fff" : "transparent",
                  color: activeTab === tab ? "#111" : "#71717a",
                  fontWeight: activeTab === tab ? 600 : 500,
                  boxShadow: activeTab === tab ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s"
                }}>{tab}</button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 9, padding: "6px 8px", cursor: "pointer", color: "#71717a", display: "flex" }}>
                <RefreshCw size={15} />
              </button>
              <button style={{
                display: "flex", alignItems: "center", gap: 6, background: "#fff",
                border: "1px solid #e4e4e7", borderRadius: 9, padding: "6px 12px", cursor: "pointer", fontSize: 13, color: "#111"
              }}>
                <CalendarDays size={14} /> Monthly <ChevronDown size={13} />
              </button>
              <button style={{
                display: "flex", alignItems: "center", gap: 6, background: "#18181b", color: "#fff",
                border: "none", borderRadius: 9, padding: "7px 14px", cursor: "pointer", fontWeight: 600, fontSize: 13
              }}>
                <Download size={14} /> Download
              </button>
            </div>
          </div>

          {/* Stat Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 16 }}>
            {statCards.map(({ label, value, change, positive }) => (
              <div key={label} style={{
                background: "#fff", borderRadius: 16, padding: "18px 20px",
                border: "1px solid #e4e4e7", boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
              }}>
                <div style={{ fontSize: 12, color: "#71717a", fontWeight: 500, marginBottom: 8 }}>{label}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 20, fontWeight: 700 }}>{value}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: positive ? "#16a34a" : "#dc2626",
                    background: positive ? "#dcfce7" : "#fee2e2", padding: "2px 7px", borderRadius: 20
                  }}>
                    {positive ? <TrendingUp size={10} style={{ display: "inline", marginRight: 2 }} /> : <TrendingDown size={10} style={{ display: "inline", marginRight: 2 }} />}
                    {change}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>

            {/* Sales Performance */}
            <div style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", border: "1px solid #e4e4e7" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Sales Performance</div>
                  <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
                    {[
                      { label: "Weekly Sales", val: "US$28,441", change: "3.3%" },
                      { label: "Daily Sales", val: "US$4,063", change: "3.3%" },
                      { label: "Total Sales", val: "278", change: "3.3%" },
                    ].map(m => (
                      <div key={m.label}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{m.val}</span>
                        <span style={{ fontSize: 11, color: "#16a34a", marginLeft: 4 }}>↑ {m.change}</span>
                        <div style={{ fontSize: 11, color: "#71717a" }}>{m.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <select style={{ border: "1px solid #e4e4e7", borderRadius: 8, padding: "4px 8px", fontSize: 12, color: "#111", cursor: "pointer" }}>
                  <option>Last 2 weeks</option>
                </select>
              </div>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={salesData} barSize={14} margin={{ left: -20, right: 0, top: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#93c5fd" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e4e4e7" }} cursor={{ fill: "#f4f4f5" }} />
                  <Bar dataKey="value" shape={<CustomBar />} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Traffic Source */}
            <div style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", border: "1px solid #e4e4e7" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Traffic Source</div>
                  <div style={{ fontWeight: 700, fontSize: 20, marginTop: 4 }}>231,856</div>
                  <div style={{ fontSize: 11, color: "#71717a" }}>Sessions</div>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  {[{ color: "#3b82f6", label: "Organic" }, { color: "#93c5fd", label: "Paid Ads" }].map(l => (
                    <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#71717a" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: l.color, display: "inline-block" }} />
                      {l.label}
                    </span>
                  ))}
                  <button style={{ background: "none", border: "none", cursor: "pointer", color: "#71717a" }}>···</button>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={trafficData} margin={{ left: -20, right: 0, top: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#f4f4f5" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false}
                    tickFormatter={v => `${v / 1000}k`} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e4e4e7" }} />
                  <Line type="monotone" dataKey="organic" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="paid" stroke="#93c5fd" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Employees Table */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e4e4e7" }}>
            {/* Table Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #f4f4f5" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>All Employees</span>
                <span style={{
                  background: "#f4f4f5", color: "#52525b", borderRadius: 20,
                  padding: "1px 8px", fontSize: 11, fontWeight: 600
                }}>32</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {[{ icon: Filter, label: "Filter" }, { icon: ArrowUpDown, label: "Sort" }, { icon: Columns, label: "Columns" }].map(({ icon: Icon, label }) => (
                    <button key={label} style={{
                      display: "flex", alignItems: "center", gap: 5, background: "#fff",
                      border: "1px solid #e4e4e7", borderRadius: 8, padding: "6px 10px",
                      cursor: "pointer", fontSize: 12, color: "#52525b", fontWeight: 500
                    }}>
                      <Icon size={13} /> {label}
                    </button>
                  ))}
                </div>
                <div style={{ position: "relative" }}>
                  <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#a1a1aa" }} />
                  <input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{
                      paddingLeft: 30, paddingRight: 10, paddingTop: 6, paddingBottom: 6,
                      border: "1px solid #e4e4e7", borderRadius: 8, fontSize: 13,
                      outline: "none", width: 180, color: "#111", background: "#fff"
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #f4f4f5" }}>
                  {["Worker ID", "Member", "Role", "Worker Type", "Actions"].map((h, i) => (
                    <th key={h} style={{
                      padding: "10px 20px", textAlign: "left", fontSize: 12,
                      color: "#71717a", fontWeight: 600,
                      ...(i === 4 ? { textAlign: "right" } : {})
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp, i) => (
                  <tr key={emp.id} style={{
                    borderBottom: i < filtered.length - 1 ? "1px solid #f4f4f5" : "none",
                    transition: "background 0.1s"
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "12px 20px", fontSize: 13, color: "#52525b" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {emp.id}
                        <Copy size={12} style={{ color: "#a1a1aa", cursor: "pointer" }} />
                      </div>
                    </td>
                    <td style={{ padding: "12px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: "50%",
                          background: `linear-gradient(135deg, ${emp.color}88, ${emp.color})`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "#fff", fontWeight: 700, fontSize: 11, flexShrink: 0
                        }}>{emp.avatar}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{emp.name}</div>
                          <div style={{ fontSize: 11, color: "#71717a" }}>{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 20px", fontSize: 13, color: "#111" }}>{emp.role}</td>
                    <td style={{ padding: "12px 20px", fontSize: 13, color: "#52525b" }}>{emp.type}</td>
                    <td style={{ padding: "12px 20px" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
                        {[
                          { icon: Eye, color: "#3b82f6", bg: "#eff6ff" },
                          { icon: Pencil, color: "#f59e0b", bg: "#fffbeb" },
                          { icon: Trash2, color: "#ef4444", bg: "#fef2f2" },
                        ].map(({ icon: Icon, color, bg }) => (
                          <button key={color} style={{
                            width: 28, height: 28, borderRadius: 8, border: "none",
                            background: bg, color, cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center"
                          }}>
                            <Icon size={13} />
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </main>
    </div>
  );
}
