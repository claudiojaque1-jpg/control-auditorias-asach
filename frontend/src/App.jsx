import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LayoutDashboard, Clock, FileText, Users, LogOut, Plus, AlertTriangle, Paperclip, User, UserPlus, Eye, Edit, CheckCircle, Filter } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

const API_URL = "https://control-auditorias-asach-production.up.railway.app";

const formatTime = (mins) => {
  if (mins === undefined || mins === null || isNaN(mins)) return "00:00";
  const isNegative = mins < 0;
  const absMins = Math.abs(mins);
  const h = Math.floor(absMins / 60);
  const m = Math.floor(absMins % 60);
  return `${isNegative ? '-' : ''}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const LOGO_URL = "/logo.png";

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin(data.user);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error de conexión con el servidor en la nube.');
    }
  };

  return (
    <div className="min-h-screen bg-blue-900 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <img src={LOGO_URL} alt="Logo" className="w-20 h-20 mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-bold text-blue-900 mb-1 leading-tight">CONTROL DE AUDITORÍAS</h1>
          <p className="text-gray-500 font-medium">Remesas ASACh</p>
        </div>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-center text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-gray-400" size={18} />
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full border rounded-lg py-2 pl-10 pr-3 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full border rounded-lg py-2 pl-10 pr-3 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            </div>
          </div>
          <button type="submit" className="w-full bg-yellow-400 text-blue-900 font-bold py-2.5 rounded-lg hover:bg-yellow-500 transition shadow-lg mt-4 text-sm">Iniciar Sesión</button>
        </form>
      </div>
    </div>
  );
}

function DashboardApp({ user, onLogout }) {
  const isAdmin = user.rol === 'Administrador';

  const themeBg = isAdmin ? 'bg-teal-800' : 'bg-blue-900';
  const themeHover = isAdmin ? 'hover:bg-teal-900' : 'hover:bg-blue-800';
  const themeActive = isAdmin ? 'bg-teal-900 font-bold' : 'bg-blue-800 font-bold';
  const themeText = isAdmin ? 'text-teal-800' : 'text-blue-900';

  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({ generadas: 0, compensadas: 0, pendientes: 0, auditores: 0, porAprobar: 0 });

  const [registros, setRegistros] = useState([]);
  const [compensaciones, setCompensaciones] = useState([]);
  const [usuariosDB, setUsuariosDB] = useState([]);

  const [dashFiltroAnio, setDashFiltroAnio] = useState('todos');
  const [dashFiltroMes, setDashFiltroMes] = useState('todos');
  const [dashFiltroUsuario, setDashFiltroUsuario] = useState('todos');

  const [rawRegistros, setRawRegistros] = useState([]);
  const [rawCompensaciones, setRawCompensaciones] = useState([]);
  const [rawUsuarios, setRawUsuarios] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [showModalComp, setShowModalComp] = useState(false);
  const [showModalUser, setShowModalUser] = useState(false);
  const [registroDetalle, setRegistroDetalle] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingEstado, setEditingEstado] = useState('Pendiente');
  const [intervinientes, setIntervinientes] = useState([]);

  const [formData, setFormData] = useState({ fecha: new Date().toISOString().split('T')[0], hora_inicio: '', hora_termino: '', motivo: 'Auditoría', actividad: '', departamento: user.departamento });
  const [compData, setCompData] = useState({ fecha: new Date().toISOString().split('T')[0], horas: '', motivo: 'Salida anticipada', observaciones: '', usuario_id: '' });

  const [editingUserId, setEditingUserId] = useState(null);
  const [userData, setUserData] = useState({ nombre: '', email: '', password: '', confirmPassword: '', cargo: '', departamento: '', rol: 'Auditor' });
  const [userError, setUserError] = useState('');

  const queryParams = `?userId=${user.id}&rol=${user.rol}`;

  const fetchData = async () => {
    try {
      if (isAdmin) {
        const resUsers = await fetch(`${API_URL}/api/usuarios`);
        if(resUsers.ok) setUsuariosDB(await resUsers.json());
      }

      const resEst = await fetch(`${API_URL}/api/estadisticas/completas${queryParams}`);
      if(resEst.ok) {
        const est = await resEst.json();
        const resRegs = await fetch(`${API_URL}/api/registros/ultimos${queryParams}`);
        const regsConEvidencia = await resRegs.json();

        setRawRegistros(regsConEvidencia || est.registrosCompletos || []);
        setRawCompensaciones(est.compensacionesCompletas || est.compensaciones || []);
        setRawUsuarios(est.usuarios || []);

        aplicarFiltrosDashboard(regsConEvidencia || [], est.compensacionesCompletas || est.compensaciones || [], est.usuarios || []);
      }
    } catch (err) {
      console.error("Error conectando al servidor", err);
    }
  };

  const aplicarFiltrosDashboard = (todosRegs, todasComps, todosUsers) => {
      let regsFiltradas = todosRegs;
      let compsFiltradas = todasComps;

      if (!isAdmin) {
          regsFiltradas = regsFiltradas.filter(r => String(r.usuario_id) === String(user.id));
          compsFiltradas = compsFiltradas.filter(c => String(c.usuario_id) === String(user.id));
      } else if (dashFiltroUsuario !== 'todos') {
          regsFiltradas = regsFiltradas.filter(r => String(r.usuario_id) === String(dashFiltroUsuario));
          compsFiltradas = compsFiltradas.filter(c => String(c.usuario_id) === String(dashFiltroUsuario));
      }

      if (dashFiltroAnio !== 'todos') {
          regsFiltradas = regsFiltradas.filter(r => r.fecha && r.fecha.startsWith(dashFiltroAnio));
          compsFiltradas = compsFiltradas.filter(c => c.fecha && c.fecha.startsWith(dashFiltroAnio));
      }

      if (dashFiltroMes !== 'todos') {
          regsFiltradas = regsFiltradas.filter(r => r.fecha && r.fecha.substring(5,7) === dashFiltroMes);
          compsFiltradas = compsFiltradas.filter(c => c.fecha && c.fecha.substring(5,7) === dashFiltroMes);
      }

      let genMin = 0, compMin = 0, porAprobarMin = 0;
      regsFiltradas.forEach(r => {
          if (r.estado === 'Aprobado') genMin += (r.horas_generadas_minutos || 0);
          if (r.estado === 'Pendiente' || r.estado === 'Autorizado') porAprobarMin += (r.horas_generadas_minutos || 0);
      });
      compsFiltradas.forEach(c => {
          compMin += (c.horas_compensadas_minutos || 0);
      });

      setStats({
          generadas: genMin,
          compensadas: compMin,
          pendientes: genMin - compMin,
          porAprobar: porAprobarMin,
          auditores: todosUsers.length
      });

      setRegistros(regsFiltradas);
      setCompensaciones(compsFiltradas);
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
      if (rawRegistros.length > 0) {
          aplicarFiltrosDashboard(rawRegistros, rawCompensaciones, rawUsuarios);
      }
  }, [dashFiltroAnio, dashFiltroMes, dashFiltroUsuario]);

  const verDetallesRegistro = async (id) => {
    try {
        const res = await fetch(`${API_URL}/api/registros/${id}`);
        if(res.ok) setRegistroDetalle(await res.json());
    } catch(err) { alert("⚠️ Error de conexión."); }
  };

  const abrirEdicion = async (r) => {
      setEditingId(r.id);
      setEditingEstado(r.estado);
      setFormData({ fecha: r.fecha, hora_inicio: r.hora_inicio || '', hora_termino: r.hora_termino || '', motivo: r.motivo, actividad: r.actividad, departamento: r.departamento || user.departamento });
      try {
          const res = await fetch(`${API_URL}/api/registros/${r.id}`);
          if(res.ok) {
              const data = await res.json();
              setIntervinientes(data.intervinientes || []);
          }
      } catch(e) {}
      setShowModal(true);
  };

  const cambiarEstado = async (id, nuevoEstado) => {
      await fetch(`${API_URL}/api/registros/${id}/estado`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: nuevoEstado })
      });
      setRegistroDetalle(null);
      fetchData();
  };

  const calcularMinutos = () => {
    if (!formData.hora_inicio || !formData.hora_termino) return 0;
    let [h1, m1] = formData.hora_inicio.split(':').map(Number);
    let [h2, m2] = formData.hora_termino.split(':').map(Number);
    let min1 = h1 * 60 + m1;
    let min2 = h2 * 60 + m2;
    if (min2 < min1) min2 += 24 * 60;
    return min2 - min1;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const minutos = (formData.hora_inicio && formData.hora_termino) ? calcularMinutos() : 0;
    let nuevoEstado = editingEstado;
    if (editingEstado === 'Autorizado' && minutos > 0) nuevoEstado = 'Aprobado';

    const payload = { ...formData, horas_generadas_minutos: minutos, usuario_id: user.id, intervinientes, estado: nuevoEstado };

    if (editingId) {
        await fetch(`${API_URL}/api/registros/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } else {
        await fetch(`${API_URL}/api/registros`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }

    setShowModal(false); setEditingId(null); setIntervinientes([]);
    fetchData();
  };

  const handleCompSubmit = async (e) => {
    e.preventDefault();
    if(!compData.usuario_id) return alert("Por favor, seleccione el auditor.");
    const [h, m] = compData.horas.split(':').map(Number);
    const totalMinutos = (h * 60) + (m || 0);

    await fetch(`${API_URL}/api/compensaciones`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...compData, horas_compensadas_minutos: totalMinutos })
    });

    setShowModalComp(false); setCompData({ fecha: new Date().toISOString().split('T')[0], horas: '', motivo: 'Salida anticipada', observaciones: '', usuario_id: '' }); fetchData();
  };

  const abrirCreacionUsuario = () => {
    setUserError('');
    setEditingUserId(null);
    setUserData({ nombre: '', email: '', password: '', confirmPassword: '', cargo: '', departamento: '', rol: 'Auditor' });
    setShowModalUser(true);
  };

  const abrirEdicionUsuario = (u) => {
    setUserError('');
    setEditingUserId(u.id);
    setUserData({ nombre: u.nombre, email: u.email, password: '', confirmPassword: '', cargo: u.cargo || '', departamento: u.departamento || '', rol: u.rol || 'Auditor' });
    setShowModalUser(true);
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    setUserError('');
    if (userData.password && userData.password !== userData.confirmPassword) {
        setUserError('⚠️ Las contraseñas no coinciden.');
        return;
    }

    try {
        const url = editingUserId ? `${API_URL}/api/usuarios/${editingUserId}` : `${API_URL}/api/usuarios`;
        const method = editingUserId ? 'PUT' : 'POST';
        const payload = { nombre: userData.nombre, email: userData.email, cargo: userData.cargo, departamento: userData.departamento, rol: userData.rol };
        if (userData.password) payload.password = userData.password;

        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok) { setUserError(`⚠️ ${data.error || 'Error al guardar usuario'}`); return; }

        setShowModalUser(false);
        fetchData();
    } catch(err) { setUserError('⚠️ Error de conexión.'); }
  };

  const renderBadgeEstado = (estado) => {
      switch(estado) {
          case 'Aprobado': return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-green-100 text-green-800">Aprobado</span>;
          case 'Autorizado': return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800">Autorizado</span>;
          case 'Rechazado': return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800">Rechazado</span>;
          default: return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-yellow-100 text-yellow-800">Pendiente</span>;
      }
  };

  // Datos para Recharts
  const tendenciaData = [
    { mes: 'Ene', Realizadas: 12, Compensadas: 10 },
    { mes: 'Feb', Realizadas: 19, Compensadas: 15 },
    { mes: 'Mar', Realizadas: 15, Compensadas: 12 },
    { mes: 'Abr', Realizadas: 25, Compensadas: 20 },
    { mes: 'May', Realizadas: 22, Compensadas: 18 },
    { mes: 'Jun', Realizadas: 30, Compensadas: 25 },
    { mes: 'Jul', Realizadas: 28, Compensadas: 24 },
    { mes: 'Ago', Realizadas: 35, Compensadas: 30 },
    { mes: 'Sep', Realizadas: 32, Compensadas: 28 },
    { mes: 'Oct', Realizadas: Math.round(stats.generadas / 60) || 10, Compensadas: Math.round(stats.compensadas / 60) || 5 }
  ];

  const estadoData = [
    { name: 'Aprobadas', value: registros.filter(r => r.estado === 'Aprobado').length || 1, color: '#10b981' },
    { name: 'Pendientes', value: registros.filter(r => r.estado === 'Pendiente').length || 1, color: '#f59e0b' },
    { name: 'Autorizadas', value: registros.filter(r => r.estado === 'Autorizado').length || 1, color: '#3b82f6' }
  ];

  const auditoresData = usuariosDB.map(u => ({
    nombre: u.nombre.split(' ')[0],
    registros: rawRegistros.filter(r => String(r.usuario_id) === String(u.id)).length
  }));

  const menuClass = (tab) => `flex items-center gap-2.5 p-2.5 w-full rounded-lg transition text-left text-xs ${activeTab === tab ? (isAdmin ? 'bg-teal-900 font-bold' : 'bg-blue-800 font-bold') : (isAdmin ? 'hover:bg-teal-900' : 'hover:bg-blue-800')}`;

  const renderContent = () => {
    if (activeTab === 'dashboard') {
      return (
        <div className="space-y-6">
          {stats.pendientes < 0 && <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-xs flex items-center gap-2"><AlertTriangle className="text-red-500" size={16} /><p className="text-red-700 font-medium">Hay <strong>{formatTime(stats.pendientes)} horas de déficit</strong> en el periodo seleccionado.</p></div>}

          {isAdmin && (
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-3 items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-gray-700 font-bold"><Filter size={16} className="text-teal-700"/> <span>Filtros del Dashboard:</span></div>
                  <div className="flex flex-wrap gap-2 items-center">
                      <select value={dashFiltroAnio} onChange={e => setDashFiltroAnio(e.target.value)} className="border rounded-lg p-2 text-xs bg-gray-50 outline-none">
                          <option value="todos">📅 Todos los Años</option><option value="2025">2025</option><option value="2026">2026</option><option value="2027">2027</option>
                      </select>
                      <select value={dashFiltroMes} onChange={e => setDashFiltroMes(e.target.value)} className="border rounded-lg p-2 text-xs bg-gray-50 outline-none">
                          <option value="todos">📆 Todos los Meses</option><option value="01">Enero</option><option value="02">Febrero</option><option value="03">Marzo</option><option value="04">Abril</option><option value="05">Mayo</option><option value="06">Junio</option><option value="07">Julio</option><option value="08">Agosto</option><option value="09">Septiembre</option><option value="10">Octubre</option><option value="11">Noviembre</option><option value="12">Diciembre</option>
                      </select>
                      <select value={dashFiltroUsuario} onChange={e => setDashFiltroUsuario(e.target.value)} className="border rounded-lg p-2 text-xs bg-gray-50 outline-none">
                          <option value="todos">👥 Todos los Auditores</option>
                          {usuariosDB.map(u => (<option key={u.id} value={u.id}>{u.nombre}</option>))}
                      </select>
                  </div>
              </div>
          )}

          {/* Tarjetas de Métricas Superiores */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-emerald-500 flex flex-col justify-between"><p className="text-gray-400 text-xs font-semibold uppercase">Aprobadas</p><h2 className={`text-2xl font-extrabold mt-1 ${themeText}`}>{formatTime(stats.generadas)}</h2></div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500 flex flex-col justify-between"><p className="text-gray-400 text-xs font-semibold uppercase">Compensadas</p><h2 className="text-2xl font-extrabold text-blue-600 mt-1">{formatTime(stats.compensadas)}</h2></div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-indigo-500 flex flex-col justify-between"><p className="text-gray-400 text-xs font-semibold uppercase">Saldo (A favor)</p><h2 className="text-2xl font-extrabold text-indigo-600 mt-1">{formatTime(stats.pendientes)}</h2></div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-amber-500 flex flex-col justify-between"><p className="text-amber-700 text-xs font-semibold uppercase">En Propuesta</p><h2 className="text-2xl font-extrabold text-amber-500 mt-1">{registros.filter(r => r.estado === 'Pendiente').length}</h2></div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-gray-400 flex flex-col justify-between"><p className="text-gray-400 text-xs font-semibold uppercase">{isAdmin ? "Auditores Activos" : "Mis Registros"}</p><h2 className="text-2xl font-extrabold text-gray-700 mt-1">{isAdmin ? stats.auditores : registros.length}</h2></div>
          </div>

          {/* SECCIÓN DE GRÁFICAS (RECHARTS) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 lg:col-span-2 flex flex-col justify-between">
              <h3 className="font-bold text-gray-700 text-sm mb-3">Tendencia de Horas: Realizadas vs Compensadas</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100% " height="100%">
                  <LineChart data={tendenciaData}>
                    <XAxis dataKey="mes" stroke="#888888" fontSize={12} />
                    <YAxis stroke="#888888" fontSize={12} />
                    <RechartsTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Realizadas" stroke="#059669" strokeWidth={2} />
                    <Line type="monotone" dataKey="Compensadas" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <h3 className="font-bold text-gray-700 text-sm mb-3">Distribución por Estado</h3>
              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={estadoData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} fill="#8884d8" label>
                      {estadoData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-700 text-sm mb-3">Carga de Trabajo por Auditor</h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={auditoresData} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis dataKey="nombre" type="category" stroke="#888888" fontSize={12} width={80} />
                    <RechartsTooltip />
                    <Bar dataKey="registros" fill="#065f46" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* TABLA DEL DASHBOARD */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-3.5 border-b border-gray-100 bg-gray-50"><h3 className="font-bold text-gray-800 text-xs">Trabajos Registrados (Filtrados)</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead><tr className="bg-white border-b text-gray-500"><th className="p-3">Fecha / Horario Propuesto</th>{isAdmin && <th className="p-3">Auditor</th>}<th className="p-3">Actividad Propuesta</th><th className="p-3">Horas Realizadas</th><th className="p-3">Estado</th><th className="p-3 text-center">Acción</th></tr></thead>
                <tbody>
                  {registros.length === 0 ? (<tr><td colSpan="6" className="p-4 text-center text-gray-500">No hay registros para este filtro</td></tr>) : registros.map(r => (
                    <tr key={r.id} className="border-b hover:bg-gray-50">
                      <td className="p-3"><div className="font-medium text-gray-800">{r.fecha}</div><div className="text-[11px] text-gray-500">{r.hora_inicio && r.hora_termino ? `⏰ ${r.hora_inicio} a ${r.hora_termino}` : 'Sin horario'}</div></td>
                      {isAdmin && <td className="p-3 font-medium">{r.auditor}</td>}
                      <td className="p-3 truncate max-w-xs">{r.actividad} {Number(r.tiene_evidencia) > 0 && <Paperclip size={13} className="inline text-teal-700 ml-1" />}</td>
                      <td className="p-3 font-bold text-gray-700">{formatTime(r.horas_generadas_minutos)}</td>
                      <td className="p-3">{renderBadgeEstado(r.estado)}</td>
                      <td className="p-3 flex justify-center gap-2">
                          <button onClick={() => verDetallesRegistro(r.id)} className="text-gray-500 hover:text-blue-600 transition" title="Ver Detalle"><Eye size={16} /></button>
                          {(isAdmin || r.estado === 'Autorizado' || r.estado === 'Pendiente') && (<button onClick={() => abrirEdicion(r)} className="text-gray-500 hover:text-blue-600 transition" title="Editar"><Edit size={16} /></button>)}
                          {isAdmin && r.estado === 'Pendiente' && (<><button onClick={() => cambiarEstado(r.id, 'Autorizado')} className="text-blue-600 bg-blue-50 px-2 py-1 rounded text-[11px]">Autorizar</button><button onClick={() => cambiarEstado(r.id, 'Rechazado')} className="text-red-600 bg-red-50 px-2 py-1 rounded text-[11px]">Rechazar</button></>)}
                          {isAdmin && r.estado === 'Autorizado' && r.horas_generadas_minutos > 0 && (<button onClick={() => cambiarEstado(r.id, 'Aprobado')} className="text-green-600"><CheckCircle size={16} /></button>)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'registros') {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden text-xs">
                <div className="p-3.5 border-b border-gray-100 bg-gray-50"><h3 className="font-bold text-gray-800">Historial General de Trabajos</h3></div>
                <table className="w-full text-left border-collapse">
                    <thead><tr className="bg-white border-b text-gray-500"><th className="p-3">Fecha</th>{isAdmin && <th className="p-3">Auditor</th>}<th className="p-3">Actividad</th><th className="p-3">Horas</th><th className="p-3">Estado</th></tr></thead>
                    <tbody>
                    {rawRegistros.map(r => (
                        <tr key={r.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">{r.fecha}</td>
                            {isAdmin && <td className="p-3 font-medium">{r.auditor}</td>}
                            <td className="p-3">{r.actividad}</td>
                            <td className="p-3 font-bold">{formatTime(r.horas_generadas_minutos)}</td>
                            <td className="p-3">{renderBadgeEstado(r.estado)}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        );
    }

    if (activeTab === 'compensaciones') {
      return (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-3.5 rounded-xl shadow-sm border border-gray-100">
            <div><h2 className="text-base font-bold text-gray-800">Historial de Compensaciones</h2></div>
            {isAdmin && <button onClick={() => setShowModalComp(true)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 flex gap-1.5 items-center"><Plus size={16} /> Registrar Compensación</button>}
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-white border-b text-gray-500"><th className="p-3">Fecha</th>{isAdmin && <th className="p-3">Auditor</th>}<th className="p-3">Motivo</th><th className="p-3">Horas</th></tr></thead>
              <tbody>
                {compensaciones.map(c => (
                  <tr key={c.id} className="border-b hover:bg-gray-50"><td className="p-3">{c.fecha}</td>{isAdmin && <td className="p-3 font-medium">{c.auditor}</td>}<td className="p-3">{c.motivo}</td><td className="p-3 font-bold text-red-600">-{formatTime(c.horas_compensadas_minutos).replace('-', '')}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (activeTab === 'usuarios' && isAdmin) {
      return (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-3.5 rounded-xl shadow-sm border border-gray-100">
            <div><h2 className="text-base font-bold text-gray-800">Administración de Usuarios</h2></div>
            <button onClick={abrirCreacionUsuario} className={`${themeBg} text-white px-3 py-1.5 rounded-lg text-xs font-medium ${themeHover} flex gap-1.5 items-center`}><UserPlus size={16} /> Nuevo Usuario</button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-white border-b text-gray-500"><th className="p-3">Nombre</th><th className="p-3">Correo</th><th className="p-3">Cargo</th><th className="p-3">Rol</th><th className="p-3 text-center">Acción</th></tr></thead>
              <tbody>
                {usuariosDB.map(u => (
                  <tr key={u.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{u.nombre}</td>
                    <td className="p-3">{u.email}</td>
                    <td className="p-3">{u.cargo}</td>
                    <td className="p-3"><span className="bg-gray-100 px-2 py-0.5 rounded font-bold">{u.rol}</span></td>
                    <td className="p-3 text-center"><button onClick={() => abrirEdicionUsuario(u)} className="text-blue-600 hover:underline">Editar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className={`w-64 ${themeBg} text-white flex flex-col justify-between hidden md:flex shadow-xl`}>
        <div>
          <div className="p-5 border-b border-teal-700/50 flex items-center gap-3">
            <img src={LOGO_URL} alt="Logo" className="w-10 h-10 object-contain bg-white rounded-lg p-1" />
            <div><h1 className="font-bold text-sm leading-tight">CONTROL AUDITORÍAS</h1><span className="text-[10px] text-teal-200">Remesas ASACh</span></div>
          </div>
          <nav className="p-3 space-y-1">
            <button onClick={() => setActiveTab('dashboard')} className={menuClass('dashboard')}><LayoutDashboard size={18} /> Dashboard</button>
            <button onClick={() => setActiveTab('registros')} className={menuClass('registros')}><FileText size={18} /> Historial Trabajos</button>
            <button onClick={() => setActiveTab('compensaciones')} className={menuClass('compensaciones')}><Clock size={18} /> Compensaciones</button>
            {isAdmin && <button onClick={() => setActiveTab('usuarios')} className={menuClass('usuarios')}><Users size={18} /> Usuarios</button>}
          </nav>
        </div>
        <div className="p-4 border-t border-teal-700/50 flex items-center justify-between text-xs">
          <div><p className="font-bold">{user.nombre}</p><p className="text-[11px] text-teal-200">{user.rol}</p></div>
          <button onClick={onLogout} className="p-2 hover:bg-teal-900 rounded-lg text-teal-200 hover:text-white transition"><LogOut size={16} /></button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="bg-white border-b border-gray-100 p-4 flex justify-between items-center shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 capitalize">{activeTab}</h2>
          <button onClick={() => setShowModal(true)} className="bg-teal-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-teal-800 flex items-center gap-1.5 shadow-sm"><Plus size={16} /> Nuevo Registro</button>
        </header>
        <div className="p-6">{renderContent()}</div>
      </main>

      {/* MODAL NUEVO / EDITAR */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto text-xs">
            <h3 className="font-bold text-base mb-4 text-gray-800">{editingId ? 'Editar Registro' : 'Nuevo Registro de Horas'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block font-medium mb-1">Fecha</label><input type="date" required value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} className="w-full border rounded-lg p-2 bg-gray-50" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block font-medium mb-1">Hora Inicio</label><input type="time" value={formData.hora_inicio} onChange={e => setFormData({...formData, hora_inicio: e.target.value})} className="w-full border rounded-lg p-2 bg-gray-50" /></div>
                <div><label className="block font-medium mb-1">Hora Término</label><input type="time" value={formData.hora_termino} onChange={e => setFormData({...formData, hora_termino: e.target.value})} className="w-full border rounded-lg p-2 bg-gray-50" /></div>
              </div>
              <div><label className="block font-medium mb-1">Actividad Realizada</label><textarea rows="3" required value={formData.actividad} onChange={e => setFormData({...formData, actividad: e.target.value})} className="w-full border rounded-lg p-2 bg-gray-50" placeholder="Describa la auditoría..."></textarea></div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-gray-600">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-teal-700 text-white rounded-lg font-bold">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL USUARIO */}
      {showModalUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl text-xs space-y-4">
            <h3 className="font-bold text-base text-gray-800">{editingUserId ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
            {userError && <div className="bg-red-50 text-red-600 p-2 rounded">{userError}</div>}
            <form onSubmit={handleUserSubmit} className="space-y-3">
              <div><label className="font-medium">Nombre</label><input type="text" required value={userData.nombre} onChange={e => setUserData({...userData, nombre: e.target.value})} className="w-full border rounded p-2" /></div>
              <div><label className="font-medium">Correo</label><input type="email" required value={userData.email} onChange={e => setUserData({...userData, email: e.target.value})} className="w-full border rounded p-2" /></div>
              <div><label className="font-medium">Contraseña</label><input type="password" value={userData.password} onChange={e => setUserData({...userData, password: e.target.value})} className="w-full border rounded p-2" /></div>
              <div><label className="font-medium">Confirmar Contraseña</label><input type="password" value={userData.confirmPassword} onChange={e => setUserData({...userData, confirmPassword: e.target.value})} className="w-full border rounded p-2" /></div>
              <div><label className="font-medium">Cargo</label><input type="text" value={userData.cargo} onChange={e => setUserData({...userData, cargo: e.target.value})} className="w-full border rounded p-2" /></div>
              <div><label className="font-medium">Rol</label><select value={userData.rol} onChange={e => setUserData({...userData, rol: e.target.value})} className="w-full border rounded p-2"><option value="Auditor">Auditor</option><option value="Administrador">Administrador</option></select></div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModalUser(false)} className="px-3 py-1.5 border rounded">Cancelar</button>
                <button type="submit" className="px-3 py-1.5 bg-teal-700 text-white rounded font-bold">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
    setLoading(false);
  }, []);

  const handleLogin = (userData) => setUser(userData);
  const handleLogout = () => { localStorage.clear(); setUser(null); };

  if (loading) return null;
  return (
    <HashRouter>
      <Routes>
        <Route path="*" element={user ? <DashboardApp user={user} onLogout={handleLogout} /> : <LoginScreen onLogin={handleLogin} />} />
      </Routes>
    </HashRouter>
  );
}