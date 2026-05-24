"use client"

import React, { useState } from "react"
import {
  Table,
  Button,
  Dropdown,
  Label,
  Tabs,
  Avatar,
  Card
} from "@heroui/react"
import {
  LayoutDashboard,
  Receipt,
  CheckSquare,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  Menu,
  FolderInput,
  Search,
  Bell,
  UserPlus,
  RefreshCw,
  ChevronDown,
  Download,
  MoreVertical,
  SlidersHorizontal,
  ArrowUpDown,
  Columns,
  Copy,
  Eye,
  Pencil,
  Trash2,
  X,
  Check,
  Plus,
  Calendar
} from "lucide-react"

// Employee mock data matching the screenshot
const initialEmployees = [
  { id: "#4586936", name: "Alex Turner", email: "alex@acme.com", role: "Product Manager", type: "Employee", initials: "AT" },
  { id: "#4586937", name: "Emma Davis", email: "emma@acme.com", role: "Senior Designer", type: "Employee", initials: "ED" },
  { id: "#4586933", name: "John Smith", email: "john@acme.com", role: "Chief Technology Officer", type: "Employee", initials: "JS" },
  { id: "#4586932", name: "Kate Moore", email: "kate@acme.com", role: "Chief Executive Officer", type: "Employee", initials: "KM" },
  { id: "#4586935", name: "Mike Wilson", email: "mike@acme.com", role: "VP of Engineering", type: "Employee", initials: "MW" },
  { id: "#4586934", name: "Sara Johnson", email: "sara@acme.com", role: "Chief Marketing Officer", type: "Employee", initials: "SJ" }
]

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("expenses")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [employees, setEmployees] = useState(initialEmployees)
  
  // Interactive Filter States
  const [selectedRange, setSelectedRange] = useState("Monthly")
  const [salesPeriod, setSalesPeriod] = useState("Last 2 weeks")
  const [showDevOverlay, setShowDevOverlay] = useState(true)

  // Copy helper
  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Delete employee helper
  const handleDelete = (id: string) => {
    setEmployees(employees.filter(emp => emp.id !== id))
  }

  // Sorting helper
  const handleSort = (field: "name" | "role" | "id") => {
    const sorted = [...employees].sort((a, b) => a[field].localeCompare(b[field]))
    setEmployees(sorted)
  }

  // Filtered list
  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.id.includes(searchQuery)
  )

  return (
    <div className="flex min-h-screen w-full bg-[#f5f5f5] text-[#1c1c1c] font-sans antialiased">
      
      {/* ─── DESKTOP SIDEBAR ─────────────────────────────────── */}
      <aside className="w-[260px] shrink-0 border-r border-[#e8e8e8] bg-[#f5f5f5] flex flex-col justify-between hidden md:flex h-screen sticky top-0 z-20">
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col items-start px-6 pt-6 pb-4 border-b border-[#f0f0f0] gap-3">
            <Avatar size="md" className="w-10 h-10">
              <Avatar.Fallback className="bg-[#0072f5] text-white font-semibold text-base">
                KM
              </Avatar.Fallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-[#1c1c1c] leading-tight">Kate Moore</span>
              <span className="text-xs font-medium text-[#737373] leading-tight mt-1">Admin</span>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            <Button
              className="flex w-full items-center justify-start gap-3 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-[#1c1c1c] shadow-[0_4px_12px_rgba(0,0,0,0.02),0_1px_2px_rgba(0,0,0,0.03)] border border-[#e8e8e8] transition-all"
            >
              <LayoutDashboard className="size-4 text-[#0072f5]" />
              <span>Dashboard</span>
            </Button>
            <Button
              variant="ghost"
              className="flex w-full items-center justify-start gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-[#737373] hover:bg-[#eaeaea]/50 hover:text-[#1c1c1c] transition-all"
            >
              <Receipt className="size-4 text-[#737373]" />
              <span>Orders</span>
            </Button>
            <Button
              variant="ghost"
              className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium text-[#737373] hover:bg-[#eaeaea]/50 hover:text-[#1c1c1c] transition-all"
            >
              <div className="flex items-center gap-3">
                <CheckSquare className="size-4 text-[#737373]" />
                <span>Tracker</span>
              </div>
              <span className="rounded-full bg-[#e8f5e9] px-2 py-0.5 text-[10px] font-semibold text-[#2e7d32]">
                New
              </span>
            </Button>
            <Button
              variant="ghost"
              className="flex w-full items-center justify-start gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-[#737373] hover:bg-[#eaeaea]/50 hover:text-[#1c1c1c] transition-all"
            >
              <BarChart3 className="size-4 text-[#737373]" />
              <span>Analytics</span>
            </Button>
            <Button
              variant="ghost"
              className="flex w-full items-center justify-start gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-[#737373] hover:bg-[#eaeaea]/50 hover:text-[#1c1c1c] transition-all"
            >
              <Settings className="size-4 text-[#737373]" />
              <span>Settings</span>
            </Button>
          </nav>
        </div>

        {/* Footer */}
        <div className="border-t border-[#e8e8e8] px-4 py-4 space-y-1">
          <Button
            variant="ghost"
            className="flex w-full items-center justify-start gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-[#737373] hover:bg-[#eaeaea]/50 hover:text-[#1c1c1c] transition-all"
          >
            <HelpCircle className="size-4 text-[#737373]" />
            <span>Help & Information</span>
          </Button>
          <Button
            variant="ghost"
            className="flex w-full items-center justify-start gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-[#737373] hover:bg-[#eaeaea]/50 hover:text-[#1c1c1c] transition-all"
          >
            <LogOut className="size-4 text-[#737373]" />
            <span>Log out</span>
          </Button>
        </div>
      </aside>

      {/* ─── MOBILE DRAWER SIDEBAR ─────────────────────────── */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="relative flex w-[260px] flex-col bg-[#f5f5f5] border-r border-[#e8e8e8] h-full z-10 p-5">
            <Button
              isIconOnly
              variant="ghost"
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-full bg-white border border-[#e8e8e8] shadow-sm"
            >
              <X className="size-4" />
            </Button>
            
            <div className="flex flex-col items-start gap-3 mt-8 mb-6 pb-4 border-b border-[#f0f0f0] w-full">
              <Avatar size="md" className="w-10 h-10">
                <Avatar.Fallback className="bg-[#0072f5] text-white font-semibold text-base">
                  KM
                </Avatar.Fallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-[#1c1c1c] leading-tight">Kate Moore</span>
                <span className="text-xs font-medium text-[#737373] leading-tight mt-1">Admin</span>
              </div>
            </div>

            <nav className="flex-1 space-y-1">
              <Button
                className="flex w-full items-center justify-start gap-3 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-[#1c1c1c] shadow-sm border border-[#e8e8e8]"
              >
                <LayoutDashboard className="size-4 text-[#0072f5]" />
                <span>Dashboard</span>
              </Button>
              <Button
                variant="ghost"
                className="flex w-full items-center justify-start gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-[#737373]"
              >
                <Receipt className="size-4" />
                <span>Orders</span>
              </Button>
              <Button
                variant="ghost"
                className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium text-[#737373]"
              >
                <div className="flex items-center gap-3">
                  <CheckSquare className="size-4" />
                  <span>Tracker</span>
                </div>
                <span className="rounded-full bg-[#e8f5e9] px-2 py-0.5 text-[10px] font-semibold text-[#2e7d32]">New</span>
              </Button>
              <Button
                variant="ghost"
                className="flex w-full items-center justify-start gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-[#737373]"
              >
                <BarChart3 className="size-4" />
                <span>Analytics</span>
              </Button>
              <Button
                variant="ghost"
                className="flex w-full items-center justify-start gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-[#737373]"
              >
                <Settings className="size-4" />
                <span>Settings</span>
              </Button>
            </nav>

            <div className="border-t border-[#e8e8e8] pt-4 space-y-1">
              <Button variant="ghost" className="flex w-full items-center justify-start gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-[#737373]">
                <HelpCircle className="size-4" />
                <span>Help & Info</span>
              </Button>
              <Button variant="ghost" className="flex w-full items-center justify-start gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-[#737373]">
                <LogOut className="size-4" />
                <span>Log out</span>
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* ─── MAIN BODY ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Sticky Header */}
        <header className="h-16 shrink-0 border-b border-[#f0f0f0] bg-[#f5f5f5]/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <Button
              isIconOnly
              variant="ghost"
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-lg hover:bg-[#eaeaea]"
            >
              <Menu className="size-5" />
            </Button>
            <div className="hidden md:flex items-center gap-2">
              <Button
                isIconOnly
                variant="ghost"
                className="p-1.5 text-[#737373] hover:text-[#1c1c1c] hover:bg-[#eaeaea] rounded-lg"
              >
                <FolderInput className="size-4" />
              </Button>
            </div>
            <h1 className="text-[#1c1c1c] text-xl font-semibold tracking-tight">Good morning, Kate</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              isIconOnly
              variant="ghost"
              className="p-2 text-[#737373] hover:text-[#1c1c1c] hover:bg-[#eaeaea] rounded-full transition-colors"
            >
              <Search className="size-4.5" />
            </Button>
            <Button
              isIconOnly
              variant="ghost"
              className="p-2 text-[#737373] hover:text-[#1c1c1c] hover:bg-[#eaeaea] rounded-full transition-colors relative"
            >
              <Bell className="size-4.5" />
              <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-red-500"></span>
            </Button>
            <Button
              className="flex items-center gap-1.5 rounded-full bg-[#0072f5] hover:bg-[#005ecb] text-white px-4 py-2 text-xs font-semibold shadow-sm transition-colors ml-1"
            >
              <Plus className="size-3.5" />
              Invite
            </Button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full flex flex-col gap-6">
          
          {/* Subheader / Toolbar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Tabs */}
            <div className="w-fit">
              <Tabs selectedKey={activeTab} onSelectionChange={(key) => setActiveTab(String(key))}>
                <Tabs.ListContainer>
                  <Tabs.List aria-label="Dashboard View Options">
                    <Tabs.Tab id="overview">Overview<Tabs.Indicator /></Tabs.Tab>
                    <Tabs.Tab id="sales">Sales<Tabs.Indicator /></Tabs.Tab>
                    <Tabs.Tab id="expenses">Expenses<Tabs.Indicator /></Tabs.Tab>
                  </Tabs.List>
                </Tabs.ListContainer>
              </Tabs>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                isIconOnly
                variant="secondary"
                className="p-2 text-[#737373] hover:text-[#1c1c1c] hover:bg-[#eaeaea] rounded-full border border-[#f0f0f0] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              >
                <RefreshCw className="size-3.5" />
              </Button>
              
              {/* Monthly Dropdown using HeroUI Dropdown */}
              <Dropdown>
                <Dropdown.Trigger>
                  <Button
                    variant="secondary"
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#737373] bg-white border border-[#f0f0f0] rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                  >
                    <Calendar className="size-3.5" />
                    {selectedRange} <ChevronDown className="size-3.5" />
                  </Button>
                </Dropdown.Trigger>
                <Dropdown.Popover className="min-w-[120px]">
                  <Dropdown.Menu onAction={(key) => setSelectedRange(String(key))}>
                    <Dropdown.Item id="Weekly" textValue="Weekly">
                      <Label>Weekly</Label>
                    </Dropdown.Item>
                    <Dropdown.Item id="Monthly" textValue="Monthly">
                      <Label>Monthly</Label>
                    </Dropdown.Item>
                    <Dropdown.Item id="Yearly" textValue="Yearly">
                      <Label>Yearly</Label>
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>

              <Button
                className="flex items-center gap-1.5 rounded-full bg-[#0072f5] hover:bg-[#005ecb] text-white px-4 py-2 text-xs font-semibold shadow-sm transition-colors"
              >
                <Download className="size-3.5" />
                Download
              </Button>
            </div>
          </div>

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            
            {/* Revenue */}
            <Card className="rounded-2xl bg-white p-5 border border-[#f0f0f0] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.04),0_2px_6px_-1px_rgba(0,0,0,0.02)] hover:translate-y-[-2px] transition-all">
              <Card.Content className="p-0 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-medium text-[#737373]">Revenue</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-semibold tracking-tight text-[#1c1c1c]">US$228,441</span>
                  <span className="flex items-center gap-0.5 rounded-full bg-[#e8f5e9] px-2 py-0.5 text-xs font-medium text-[#2e7d32]">
                    <span className="text-[10px]">▲</span> 3.3%
                  </span>
                </div>
              </Card.Content>
            </Card>

            {/* Expenses */}
            <Card className="rounded-2xl bg-white p-5 border border-[#f0f0f0] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.04),0_2px_6px_-1px_rgba(0,0,0,0.02)] hover:translate-y-[-2px] transition-all">
              <Card.Content className="p-0 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-medium text-[#737373]">Expenses</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-semibold tracking-tight text-[#1c1c1c]">US$25,108</span>
                  <span className="flex items-center gap-0.5 rounded-full bg-[#ffebee] px-2 py-0.5 text-xs font-medium text-[#c62828]">
                    <span className="text-[10px]">▼</span> 3.3%
                  </span>
                </div>
              </Card.Content>
            </Card>

            {/* Sales */}
            <Card className="rounded-2xl bg-white p-5 border border-[#f0f0f0] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.04),0_2px_6px_-1px_rgba(0,0,0,0.02)] hover:translate-y-[-2px] transition-all">
              <Card.Content className="p-0 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-medium text-[#737373]">Sales</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-semibold tracking-tight text-[#1c1c1c]">458</span>
                  <span className="flex items-center gap-0.5 rounded-full bg-[#e8f5e9] px-2 py-0.5 text-xs font-medium text-[#2e7d32]">
                    <span className="text-[10px]">▲</span> 3.3%
                  </span>
                </div>
              </Card.Content>
            </Card>

            {/* Profit */}
            <Card className="rounded-2xl bg-white p-5 border border-[#f0f0f0] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.04),0_2px_6px_-1px_rgba(0,0,0,0.02)] hover:translate-y-[-2px] transition-all">
              <Card.Content className="p-0 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-medium text-[#737373]">Profit</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-semibold tracking-tight text-[#1c1c1c]">US$203,133</span>
                  <span className="flex items-center gap-0.5 rounded-full bg-[#e8f5e9] px-2 py-0.5 text-xs font-medium text-[#2e7d32]">
                    <span className="text-[10px]">▲</span> 4.1%
                  </span>
                </div>
              </Card.Content>
            </Card>

          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            
            {/* Sales Performance Bar Chart */}
            <Card className="rounded-2xl bg-white p-6 border border-[#f0f0f0] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.04),0_2px_6px_-1px_rgba(0,0,0,0.02)]">
              <Card.Content className="p-0 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-base font-semibold text-[#1c1c1c]">Sales Performance</h3>
                  
                  {/* Period dropdown selection */}
                  <Dropdown>
                    <Dropdown.Trigger>
                      <Button
                        variant="secondary"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#737373] bg-white border border-[#f0f0f0] rounded-full hover:bg-neutral-50 shadow-sm"
                      >
                        {salesPeriod}
                        <ChevronDown className="size-3.5" />
                      </Button>
                    </Dropdown.Trigger>
                    <Dropdown.Popover className="min-w-[140px]">
                      <Dropdown.Menu onAction={(key) => setSalesPeriod(String(key))}>
                        <Dropdown.Item id="Last week" textValue="Last week">
                          <Label>Last week</Label>
                        </Dropdown.Item>
                        <Dropdown.Item id="Last 2 weeks" textValue="Last 2 weeks">
                          <Label>Last 2 weeks</Label>
                        </Dropdown.Item>
                        <Dropdown.Item id="Last month" textValue="Last month">
                          <Label>Last month</Label>
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown.Popover>
                  </Dropdown>
                </div>

                <div className="flex flex-wrap items-center gap-6 mb-6">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-semibold text-[#1c1c1c]">$28,441</span>
                      <span className="text-[10px] text-[#2e7d32] font-semibold">▲ 3.3%</span>
                    </div>
                    <span className="text-xs text-[#737373]">Weekly Sales</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-semibold text-[#1c1c1c]">$4,063</span>
                      <span className="text-[10px] text-[#2e7d32] font-semibold">▲ 3.3%</span>
                    </div>
                    <span className="text-xs text-[#737373]">Daily Sales</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-semibold text-[#1c1c1c]">278</span>
                      <span className="text-[10px] text-[#2e7d32] font-semibold">▲ 3.3%</span>
                    </div>
                    <span className="text-xs text-[#737373]">Total Sales</span>
                  </div>
                </div>

                {/* Empty Bar charts container with bottom labels */}
                <div className="flex items-end justify-between h-[180px] w-full pt-4 pb-2 border-b border-[#f0f0f0]/60">
                  {Array.from({ length: 12 }).map((_, idx) => (
                    <div key={idx} className="flex flex-col items-center justify-end h-full flex-1">
                      <span className="text-[10px] text-[#737373]">{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}</span>
                    </div>
                  ))}
                </div>
              </Card.Content>
            </Card>

            {/* Traffic Source Line Chart */}
            <Card className="rounded-2xl bg-white p-6 border border-[#f0f0f0] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.04),0_2px_6px_-1px_rgba(0,0,0,0.02)]">
              <Card.Content className="p-0 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-base font-semibold text-[#1c1c1c]">Traffic Source</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="size-2.5 rounded-full bg-[#0072f5]" />
                        <span className="text-xs text-[#737373]">Organic</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="size-2.5 rounded-full bg-[#00b0ff]" />
                        <span className="text-xs text-[#737373]">Paid Ads</span>
                      </div>
                    </div>
                    
                    {/* Action dropdown for Traffic Source */}
                    <Dropdown>
                      <Dropdown.Trigger>
                        <Button
                          isIconOnly
                          variant="ghost"
                          className="p-1.5 text-[#737373] hover:text-[#1c1c1c] rounded-lg"
                        >
                          <MoreVertical className="size-4" />
                        </Button>
                      </Dropdown.Trigger>
                      <Dropdown.Popover className="min-w-[120px]">
                        <Dropdown.Menu onAction={(key) => alert(`Action: ${key}`)}>
                          <Dropdown.Item id="refresh" textValue="Refresh data">
                            <Label>Refresh</Label>
                          </Dropdown.Item>
                          <Dropdown.Item id="export" textValue="Export details">
                            <Label>Export</Label>
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown.Popover>
                    </Dropdown>
                  </div>
                </div>

                <div className="flex flex-col mb-4">
                  <span className="text-lg font-semibold text-[#1c1c1c]">231,856</span>
                  <span className="text-xs text-[#737373]">Sessions</span>
                </div>

                {/* Dual-line SVG Chart */}
                <div className="relative w-full h-[180px]">
                  <svg className="w-full h-full" viewBox="0 0 600 160" preserveAspectRatio="none">
                    {/* Grid Lines */}
                    <line x1="10" y1="40" x2="590" y2="40" stroke="#f0f0f0" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="10" y1="80" x2="590" y2="80" stroke="#f0f0f0" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="10" y1="120" x2="590" y2="120" stroke="#f0f0f0" strokeWidth="1" strokeDasharray="3 3" />

                    {/* Organic Line (Blue) */}
                    <path
                      d="M 10,130 C 50,110 80,70 120,70 C 160,70 180,115 220,115 C 260,115 280,45 320,45 C 360,45 380,120 420,120 C 460,120 480,40 520,40 C 560,40 570,85 590,100"
                      fill="none"
                      stroke="#0072f5"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    {/* Paid Ads Line (Light Blue) */}
                    <path
                      d="M 10,140 C 40,110 70,55 110,55 C 150,55 170,105 210,105 C 250,105 270,60 310,60 C 350,60 370,130 410,130 C 450,130 470,30 510,30 C 550,30 570,80 590,110"
                      fill="none"
                      stroke="#00b0ff"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <div className="flex justify-between text-[10px] text-[#737373] mt-2 px-1">
                  {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m) => (
                    <span key={m}>{m}</span>
                  ))}
                </div>
              </Card.Content>
            </Card>

          </div>

          {/* Employees Table Section */}
          <div className="flex flex-col gap-4">
            
            {/* Title & Badge */}
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-[#1c1c1c]">All Employees</span>
              <span className="rounded-full bg-[#eaeaea] px-2 py-0.5 text-xs font-semibold text-[#737373]">
                {filteredEmployees.length}
              </span>
            </div>

            {/* Table Toolbar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  className="flex items-center gap-1.5 rounded-full border border-[#f0f0f0] bg-white px-3 py-1.5 text-xs font-semibold text-[#737373] hover:text-[#1c1c1c] shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                >
                  <SlidersHorizontal className="size-3.5" />
                  Filter
                </Button>

                {/* Sort Actions Dropdown */}
                <Dropdown>
                  <Dropdown.Trigger>
                    <Button
                      variant="secondary"
                      className="flex items-center gap-1.5 rounded-full border border-[#f0f0f0] bg-white px-3 py-1.5 text-xs font-semibold text-[#737373] hover:text-[#1c1c1c] shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                    >
                      <ArrowUpDown className="size-3.5" />
                      Sort
                    </Button>
                  </Dropdown.Trigger>
                  <Dropdown.Popover className="min-w-[120px]">
                    <Dropdown.Menu onAction={(key) => handleSort(key as "name" | "role" | "id")}>
                      <Dropdown.Item id="name" textValue="Sort by Name">
                        <Label>Name</Label>
                      </Dropdown.Item>
                      <Dropdown.Item id="role" textValue="Sort by Role">
                        <Label>Role</Label>
                      </Dropdown.Item>
                      <Dropdown.Item id="id" textValue="Sort by Worker ID">
                        <Label>Worker ID</Label>
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown.Popover>
                </Dropdown>

                <Button
                  variant="secondary"
                  className="flex items-center gap-1.5 rounded-full border border-[#f0f0f0] bg-white px-3 py-1.5 text-xs font-semibold text-[#737373] hover:text-[#1c1c1c] shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                >
                  <Columns className="size-3.5" />
                  Columns
                </Button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-[220px]">
                <Search className="absolute left-3 top-2.5 size-3.5 text-[#737373]" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full border border-[#f0f0f0] bg-white pl-9 pr-4 py-2 text-xs font-medium placeholder-[#737373] focus:outline-none focus:border-[#0072f5]"
                />
              </div>
            </div>

            {/* Table Container using official HeroUI compound component */}
            <div className="w-full overflow-x-auto rounded-2xl border border-[#f0f0f0] bg-white shadow-[0_4px_20px_-2px_rgba(0,0,0,0.04),0_2px_6px_-1px_rgba(0,0,0,0.02)]">
              <Table>
                <Table.ScrollContainer>
                  <Table.Content aria-label="Employees List" className="min-w-[700px] w-full">
                    <Table.Header>
                      <Table.Column>Worker ID</Table.Column>
                      <Table.Column>Member</Table.Column>
                      <Table.Column>Role</Table.Column>
                      <Table.Column>Worker Type</Table.Column>
                      <Table.Column className="text-end">Actions</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {filteredEmployees.map((emp) => (
                        <Table.Row key={emp.id}>
                          {/* Worker ID */}
                          <Table.Cell>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-medium">{emp.id}</span>
                              <Button
                                isIconOnly
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopy(emp.id)}
                                className="p-1 rounded text-[#737373] hover:text-[#1c1c1c] hover:bg-[#eaeaea]/40 min-w-0 h-auto"
                              >
                                {copiedId === emp.id ? (
                                  <Check className="size-3.5 text-green-600 animate-scale" />
                                ) : (
                                  <Copy className="size-3.5" />
                                )}
                              </Button>
                            </div>
                          </Table.Cell>

                          {/* Member Info */}
                          <Table.Cell>
                            <div className="flex items-center gap-3">
                              <Avatar size="sm">
                                <Avatar.Fallback className="bg-[#eaeaea] text-[#737373] text-xs font-semibold">
                                  {emp.initials}
                                </Avatar.Fallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold text-[#1c1c1c]">{emp.name}</span>
                                <span className="text-[10px] text-[#737373]">{emp.email}</span>
                              </div>
                            </div>
                          </Table.Cell>

                          {/* Role */}
                          <Table.Cell className="text-xs text-[#737373]">
                            {emp.role}
                          </Table.Cell>

                          {/* Worker Type */}
                          <Table.Cell className="text-xs text-[#737373]">
                            {emp.type}
                          </Table.Cell>

                          {/* Actions */}
                          <Table.Cell className="text-end">
                            <div className="flex justify-end gap-1">
                              <Button
                                isIconOnly
                                variant="ghost"
                                size="sm"
                                className="p-1.5 rounded-lg text-[#737373] hover:text-[#1c1c1c] hover:bg-[#eaeaea]/40 transition-colors min-w-0"
                              >
                                <Eye className="size-4" />
                              </Button>
                              <Button
                                isIconOnly
                                variant="ghost"
                                size="sm"
                                className="p-1.5 rounded-lg text-[#737373] hover:text-[#1c1c1c] hover:bg-[#eaeaea]/40 transition-colors min-w-0"
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                isIconOnly
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(emp.id)}
                                className="p-1.5 rounded-lg text-[#c62828] hover:bg-red-50 transition-colors min-w-0"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                      {filteredEmployees.length === 0 && (
                        <Table.Row>
                          <Table.Cell className="text-center text-xs text-[#737373] py-8" colSpan={5}>
                            No employees found matching the search.
                          </Table.Cell>
                        </Table.Row>
                      )}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
            </div>

          </div>

        </main>
      </div>

      {/* Floating Next.js Dev Indicator Overlay */}
      {showDevOverlay && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-[#f87171] border border-[#ef4444] text-[#7f1d1d] px-3 py-1.5 text-xs font-semibold shadow-lg transition-all animate-fade-in">
          <span className="flex items-center justify-center w-4.5 h-4.5 rounded-full bg-[#b91c1c] text-white text-[9px] font-black leading-none">N</span>
          <span>1 Issue</span>
          <button
            onClick={() => setShowDevOverlay(false)}
            className="ml-1 p-0.5 rounded-full hover:bg-[#fee2e2] text-[#7f1d1d] transition-colors"
          >
            <X className="size-3" />
          </button>
        </div>
      )}

    </div>
  )
}