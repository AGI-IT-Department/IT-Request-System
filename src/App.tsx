/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Package, 
  ClipboardList, 
  Users, 
  FileText, 
  PieChart, 
  Settings,
  Plus,
  Search,
  Filter,
  Download,
  AlertTriangle
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart as RPieChart,
  Pie
} from "recharts";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";


function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Pages will be simplified and kept in one file for now or imported if complex
import { api } from "./lib/api";

type Page = "dashboard" | "inventory" | "requests" | "employees" | "reports" | "analytics" | "settings";

export default function App() {
  const [activePage, setActivePage] = useState<Page>("dashboard");
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("all");
  const [reqFilter, setReqFilter] = useState("");

  useEffect(() => {
    api.getProjects().then(setProjects);
  }, []);

  const handleFilterEmployee = (name: string) => {
    setReqFilter(name);
    setActivePage("requests");
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <Package className="text-white w-5 h-5" />
            </div>
            <h1 className="font-bold text-xl tracking-tight text-slate-800">Construx</h1>
          </div>

          <nav className="space-y-1">
            <NavItem 
              active={activePage === "dashboard"} 
              icon={<LayoutDashboard size={20} />} 
              label="Dashboard" 
              onClick={() => { setActivePage("dashboard"); setReqFilter(""); }} 
            />
            <NavItem 
              active={activePage === "inventory"} 
              icon={<Package size={20} />} 
              label="Inventory" 
              onClick={() => setActivePage("inventory")} 
            />
            <NavItem 
              active={activePage === "requests"} 
              icon={<ClipboardList size={20} />} 
              label="Requests" 
              onClick={() => { setActivePage("requests"); setReqFilter(""); }} 
            />
            <NavItem 
              active={activePage === "employees"} 
              icon={<Users size={20} />} 
              label="Employee Assets" 
              onClick={() => setActivePage("employees")} 
            />
            <NavItem 
              active={activePage === "reports"} 
              icon={<FileText size={20} />} 
              label="Reports" 
              onClick={() => setActivePage("reports")} 
            />
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-100">
          <NavItem 
            active={activePage === "settings"} 
            icon={<Settings size={20} />} 
            label="Settings" 
            onClick={() => setActivePage("settings")} 
          />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="h-16 bg-white border-bottom border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm shadow-slate-100/50">
          <div className="flex items-center gap-4">
            <select 
              className="bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              <option value="all">All Projects</option>
              {projects.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right mr-2">
              <p className="text-sm font-semibold text-slate-700">IT Admin</p>
              <p className="text-xs text-slate-500">Mina Mousa</p>
            </div>
            <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold">
              MM
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {activePage === "dashboard" && <DashboardView />}
          {activePage === "inventory" && <InventoryView projectId={selectedProject} />}
          {activePage === "requests" && <RequestsView initialFilter={reqFilter} />}
          {activePage === "employees" && <EmployeesView onFilterEmployee={handleFilterEmployee} />}
          {activePage === "reports" && <ReportsView />}
        </div>
      </main>
    </div>
  );
}

function NavItem({ active, icon, label, onClick }: { active: boolean, icon: any, label: string, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium",
        active 
          ? "bg-blue-50 text-blue-700" 
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// --- Views Implementation ---

function DashboardView() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api.getStats().then(setStats);
  }, []);

  if (!stats) return <div>Loading...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Overview</h2>
        <p className="text-slate-500">Asset & inventory summary across all projects.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Active Projects" value={stats.totalProjects.count} icon={<LayoutDashboard className="text-blue-600" />} />
        <StatCard title="Total Employees" value={stats.totalEmployees.count} icon={<Users className="text-emerald-600" />} />
        <StatCard title="Pending Requests" value={stats.pendingRequests.count} icon={<ClipboardList className="text-amber-600" />} trend="High Priority" />
        <StatCard title="Low Stock Items" value={stats.lowStock.count} icon={<AlertTriangle className="text-rose-600" />} trend={stats.lowStock.count > 0 ? "Action Required" : "Stable"} danger={stats.lowStock.count > 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6">Stock Movement (Monthly)</h3>
          <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Jan', received: 40, delivered: 24 },
                { name: 'Feb', received: 30, delivered: 13 },
                { name: 'Mar', received: 20, delivered: 38 },
                { name: 'Apr', received: 27, delivered: 39 },
                { name: 'May', received: 18, delivered: 48 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="received" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="delivered" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6">Device Distribution</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RPieChart>
                <Pie
                  data={[
                    { name: 'Laptops', value: 45 },
                    { name: 'Desktops', value: 25 },
                    { name: 'Monitors', value: 20 },
                    { name: 'Printers', value: 10 },
                  ]}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#3b82f6" />
                  <Cell fill="#10b981" />
                  <Cell fill="#f59e0b" />
                  <Cell fill="#6366f1" />
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
              </RPieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend, danger }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
        {trend && (
          <span className={cn(
            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
            danger ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500"
          )}>
            {trend}
          </span>
        )}
      </div>
      <p className="text-slate-500 text-sm font-medium">{title}</p>
      <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
    </div>
  );
}

function InventoryView({ projectId }: { projectId: string }) {
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    api.getInventory(projectId === "all" ? undefined : projectId).then(setItems);
  }, [projectId]);

  const filtered = items.filter((i: any) => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Inventory</h2>
          <p className="text-slate-500 text-sm">Manage hardware and software stock across projects.</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm">
          <Plus size={18} />
          Add Item
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search assets..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors">
            <Filter size={18} />
          </button>
          <button className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors">
            <Download size={18} />
          </button>
        </div>

        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Asset Name</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Available</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((item: any) => (
              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <p className="text-sm font-semibold text-slate-700">{item.name}</p>
                  <p className="text-xs text-slate-400 uppercase font-mono tracking-tight">{item.subcategory}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-slate-600">{item.category}</span>
                </td>
                <td className="px-6 py-4 font-mono text-sm">{item.totalQty}</td>
                <td className="px-6 py-4 font-mono text-sm">{item.availableQty}</td>
                <td className="px-6 py-4">
                  <Badge 
                    label={item.availableQty < 5 ? "Low Stock" : "Healthy"} 
                    variant={item.availableQty < 5 ? "danger" : "success"} 
                  />
                </td>
                <td className="px-6 py-4 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button className="text-blue-600 text-xs font-bold hover:underline">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RequestsView({ initialFilter = "" }: { initialFilter?: string }) {
  const [requests, setRequests] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [showProjModal, setShowProjModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState(initialFilter);

  const [formData, setFormData] = useState({
    employeeId: "",
    projectId: "",
    inventoryId: "",
    type: "Hardware Request",
    description: "",
    status: "Requested",
    requestDate: new Date().toISOString().split('T')[0],
    deliveryDate: "",
    notes: ""
  });

  const [newEmp, setNewEmp] = useState({ name: "", position: "", department: "", projectId: "", email: "", phone: "" });
  const [newProj, setNewProj] = useState({ name: "", description: "" });

  useEffect(() => {
    setSearchTerm(initialFilter);
  }, [initialFilter]);

  const loadData = () => {
    api.getRequests().then(setRequests);
    api.getEmployees().then(setEmployees);
    api.getInventory().then(setInventory);
    api.getProjects().then(setProjects);
  };
  
  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: any, addAnother = false) => {
    if (e) e.preventDefault();
    try {
      const res = await api.createRequest(formData);
      if (res.error) {
        alert(res.error);
        return;
      }
      if (!addAnother) {
        setShowModal(false);
      } else {
        // Reset only item fields for another request for same person/project
        setFormData(prev => ({
          ...prev,
          inventoryId: "",
          description: "",
          notes: ""
        }));
      }
      loadData();
    } catch (err) {
      alert("Error creating request");
    }
  };

  const handleAddEmployee = async (e: any) => {
    e.preventDefault();
    try {
      const res = await api.createEmployee(newEmp);
      if (res.error) {
        alert(res.error);
        return;
      }
      setFormData(prev => ({ ...prev, employeeId: res.id.toString(), projectId: newEmp.projectId }));
      setShowEmpModal(false);
      loadData();
      setNewEmp({ name: "", position: "", department: "", projectId: "", email: "", phone: "" });
    } catch (err) {
      alert("Error adding employee");
    }
  };

  const handleAddProject = async (e: any) => {
    e.preventDefault();
    try {
      const res = await api.createProject(newProj);
      if (res.error) {
        alert(res.error);
        return;
      }
      setFormData(prev => ({ ...prev, projectId: res.id.toString() }));
      setShowProjModal(false);
      loadData();
      setNewProj({ name: "", description: "" });
    } catch (err) {
      alert("Error adding project");
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      const res = await api.updateRequestStatus(id, status);
      if (res.error) {
        alert(res.error);
        return;
      }
      loadData();
    } catch (err) {
      alert("Error updating status");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Requests Log</h2>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-slate-900 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-slate-800 transition-colors"
        >
          New Request
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold mb-6">New Asset Request</h3>
            <form className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase">Employee</label>
                  <button type="button" onClick={() => setShowEmpModal(true)} className="text-blue-600 text-[10px] font-bold hover:underline flex items-center gap-1">
                    <Plus size={10} /> Add New
                  </button>
                </div>
                <select 
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  value={formData.employeeId}
                  onChange={e => setFormData({...formData, employeeId: e.target.value})}
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp: any) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase">Project</label>
                  <button type="button" onClick={() => setShowProjModal(true)} className="text-blue-600 text-[10px] font-bold hover:underline flex items-center gap-1">
                    <Plus size={10} /> Add New
                  </button>
                </div>
                <select 
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  value={formData.projectId}
                  onChange={e => setFormData({...formData, projectId: e.target.value})}
                >
                  <option value="">Select Project</option>
                  {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Stock Item (EMAAR Only)</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  value={formData.inventoryId}
                  onChange={e => setFormData({...formData, inventoryId: e.target.value})}
                >
                  <option value="">Generic / Other</option>
                  {inventory.filter((i:any) => formData.projectId == i.projectId).map((i: any) => (
                    <option key={i.id} value={i.id}>{i.name} ({i.availableQty} available)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                >
                  <option>Hardware Request</option>
                  <option>Software Request</option>
                  <option>GSM Request</option>
                  <option>IT Phone Request</option>
                  <option>Printer Request</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold"
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value})}
                >
                  <option value="Requested">Requested (Waiting)</option>
                  <option value="Delivered">Delivered (Received)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Request Date</label>
                  <input 
                    type="date"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    value={formData.requestDate}
                    onChange={e => setFormData({...formData, requestDate: e.target.value})}
                  />
                </div>
                {formData.status === "Delivered" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Delivery Date</label>
                    <input 
                      type="date"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      value={formData.deliveryDate || new Date().toISOString().split('T')[0]}
                      onChange={e => setFormData({...formData, deliveryDate: e.target.value})}
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notes / Remarks</label>
                <textarea 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Additional details..."
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                />
              </div>
              <div className="flex flex-col gap-2 pt-4">
                <div className="flex gap-4">
                  <button type="button" onClick={(e) => handleSubmit(e)} className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 shadow-sm transition-all">Submit</button>
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 text-slate-600 font-bold py-2 rounded-lg hover:bg-slate-200 transition-all">Cancel</button>
                </div>
                <button type="button" onClick={(e) => handleSubmit(e, true)} className="w-full bg-emerald-50 text-emerald-600 font-bold py-2 rounded-lg hover:bg-emerald-100 border border-emerald-100 transition-all text-xs">
                  Submit and Add Another Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEmpModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Quick Add Employee</h3>
            <form onSubmit={handleAddEmployee} className="space-y-4">
              <input 
                placeholder="Full Name" required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value})}
              />
              <input 
                placeholder="Designation" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={newEmp.position} onChange={e => setNewEmp({...newEmp, position: e.target.value})}
              />
              <select 
                required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-500"
                value={newEmp.projectId} onChange={e => setNewEmp({...newEmp, projectId: e.target.value})}
              >
                <option value="">Select Project</option>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700">Add</button>
                <button type="button" onClick={() => setShowEmpModal(false)} className="flex-1 bg-slate-100 text-slate-600 font-bold py-2 rounded-lg">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showProjModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-4">New Project</h3>
            <form onSubmit={handleAddProject} className="space-y-4">
              <input 
                placeholder="Project Name (e.g. EMAAR)" required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={newProj.name} onChange={e => setNewProj({...newProj, name: e.target.value})}
              />
              <input 
                placeholder="Description" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={newProj.description} onChange={e => setNewProj({...newProj, description: e.target.value})}
              />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700">Create</button>
                <button type="button" onClick={() => setShowProjModal(false)} className="flex-1 bg-slate-100 text-slate-600 font-bold py-2 rounded-lg">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Filter by employee or item..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Employee Details</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Item Required</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Project</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Request Date</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Received Date</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Notes</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {requests.filter((r:any) => 
               r.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
               r.itemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               r.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               r.notes?.toLowerCase().includes(searchTerm.toLowerCase())
            ).map((r: any) => (
              <tr key={r.id}>
                <td className="px-6 py-4">
                  <p className="text-sm font-semibold text-slate-700">{r.employeeName || "System"}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{r.employeePosition || "Staff"}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-slate-600 font-bold">{r.itemName || r.type}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{r.description || "-"}</p>
                </td>
                <td className="px-6 py-4">
                   <p className="text-sm font-bold text-slate-600">{r.projectName}</p>
                </td>
                <td className="px-6 py-4">
                  <Badge label={r.status} variant={r.status === 'Received' || r.status === 'Delivered' ? 'success' : 'warning'} />
                </td>
                <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                  {r.requestDate || new Date(r.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-xs text-emerald-600 font-bold">
                  {r.deliveryDate || "-"}
                </td>
                <td className="px-6 py-4">
                  <p className="text-xs text-slate-500 italic max-w-[200px] truncate" title={r.notes}>{r.notes || "-"}</p>
                </td>
                <td className="px-6 py-4 text-right">
                  {r.status === 'Requested' && (
                    <button 
                      onClick={() => updateStatus(r.id, "Delivered")}
                      className="text-emerald-600 text-xs font-bold hover:underline"
                    >
                      Deliver & Deduct
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmployeesView({ onFilterEmployee }: { onFilterEmployee: (name: string) => void }) {
  const [employees, setEmployees] = useState([]);
  
  useEffect(() => {
    api.getEmployees().then(setEmployees);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Employee Directory</h2>
        <div className="text-sm text-slate-500">Total: {employees.length} Employees</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees.map((e: any) => (
          <div key={e.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-200 transition-all hover:shadow-md group">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center font-bold text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                {e.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-slate-800">{e.name}</h3>
                <p className="text-xs text-slate-500">{e.position}</p>
              </div>
            </div>
            <div className="space-y-2 border-t border-slate-100 pt-4 mt-4">
               <div className="flex justify-between text-xs">
                <span className="text-slate-400">Department</span>
                <span className="text-slate-700 font-medium">{e.department || 'EMAAR Project'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Email</span>
                <span className="text-slate-700 font-medium truncate max-w-[150px]">{e.email || 'pending@emaar.ae'}</span>
              </div>
              <button 
                onClick={() => onFilterEmployee(e.name)}
                className="w-full mt-4 bg-slate-50 text-slate-600 text-xs font-bold py-2 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <ClipboardList size={14} />
                View Asset History
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportsView() {
  const [requests, setRequests] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    projectId: "all",
    type: "all"
  });

  useEffect(() => {
    api.getRequests().then(setRequests);
    api.getProjects().then(setProjects);
  }, []);

  const types = Array.from(new Set(requests.map((r: any) => r.type)));

  const filteredData = requests.filter((r: any) => {
    const rDate = r.requestDate || r.createdAt.split('T')[0];
    const matchDate = (!filters.startDate || rDate >= filters.startDate) && 
                     (!filters.endDate || rDate <= filters.endDate);
    const matchProject = filters.projectId === "all" || r.projectId.toString() === filters.projectId;
    const matchType = filters.type === "all" || r.type === filters.type;
    return matchDate && matchProject && matchType;
  });

  const downloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Filtered Requests");
    XLSX.writeFile(workbook, `IT_Requests_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const downloadPDF = () => {
    const doc: any = new jsPDF();
    doc.setFontSize(18);
    doc.text("IT Asset Request Report", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Filters: ${filters.projectId === 'all' ? 'All Projects' : 'Specific Project'}, Date: ${filters.startDate || 'Any'} to ${filters.endDate || 'Any'}`, 14, 35);
    
    doc.autoTable({
      startY: 45,
      head: [['Employee', 'Item', 'Project', 'Status', 'Request Date', 'Received Date']],
      body: filteredData.map((r: any) => [
        r.employeeName, 
        r.itemName || r.type, 
        r.projectName, 
        r.status, 
        r.requestDate || "-", 
        r.deliveryDate || "-"
      ]),
      headStyles: { fillStyle: '#1e293b', textColor: '#ffffff' },
      alternateRowStyles: { fillStyle: '#f8fafc' },
    });
    doc.save(`IT_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Reports & Analytics</h2>
          <p className="text-slate-500 text-sm">Filter data and export custom reports.</p>
        </div>
        <div className="flex gap-3">
           <button onClick={downloadPDF} className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-50 shadow-sm">
            <Download size={16} /> PDF Export
          </button>
          <button onClick={downloadExcel} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-800 shadow-sm">
            <Filter size={16} /> Excel Export
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Start Date</label>
            <input 
              type="date" 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={filters.startDate}
              onChange={e => setFilters({...filters, startDate: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">End Date</label>
            <input 
              type="date" 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={filters.endDate}
              onChange={e => setFilters({...filters, endDate: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Project</label>
            <select 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={filters.projectId}
              onChange={e => setFilters({...filters, projectId: e.target.value})}
            >
              <option value="all">All Projects</option>
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Request Type</label>
            <select 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={filters.type}
              onChange={e => setFilters({...filters, type: e.target.value})}
            >
              <option value="all">Any Type</option>
              {types.map((t: string) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        
        <div className="flex justify-end mt-4">
          <button 
            onClick={() => setFilters({ startDate: "", endDate: "", projectId: "all", type: "all" })}
            className="text-xs text-slate-400 hover:text-slate-600 font-bold underline"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
           <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Previewing {filteredData.length} records</h3>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/50">
            <tr>
              <th className="px-6 py-3 font-semibold text-slate-600">Employee</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Item</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Project</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Date</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.slice(0, 10).map((r: any) => (
              <tr key={r.id}>
                <td className="px-6 py-3 text-slate-700">{r.employeeName}</td>
                <td className="px-6 py-3 text-slate-500">{r.itemName || r.type}</td>
                <td className="px-6 py-3 font-medium text-slate-600">{r.projectName}</td>
                <td className="px-6 py-3 text-slate-400">{r.requestDate || '-'}</td>
                <td className="px-6 py-3">
                  <Badge label={r.status} variant={r.status === 'Delivered' ? 'success' : 'warning'} />
                </td>
              </tr>
            ))}
            {filteredData.length > 10 && (
              <tr>
                <td colSpan={5} className="px-6 py-3 text-center text-slate-400 text-xs italic">
                  And {filteredData.length - 10} more records... Export for full details.
                </td>
              </tr>
            )}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                  No records found matching filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportActionTile({ title, description, onClick }: { title: string, description: string, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "p-6 bg-white rounded-2xl border border-slate-200 flex justify-between items-center group hover:bg-slate-50 transition-colors cursor-pointer",
        !onClick && "opacity-60 cursor-not-allowed"
      )}
    >
      <div>
        <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors uppercase text-xs tracking-widest">{title}</h4>
        <p className="text-sm text-slate-500 mt-1">{description}</p>
      </div>
      <Download className="text-slate-300 group-hover:text-slate-600 transition-colors" size={24} />
    </div>
  );
}


function Badge({ label, variant = "default" }: { label: string, variant?: "default" | "success" | "warning" | "danger" }) {
  const styles = {
    default: "bg-slate-100 text-slate-600",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600 font-medium",
    danger: "bg-rose-50 text-rose-600 font-bold",
  };
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", styles[variant])}>
      {label}
    </span>
  );
}

