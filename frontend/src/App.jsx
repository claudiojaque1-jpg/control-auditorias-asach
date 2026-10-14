import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LayoutDashboard, Clock, FileText, Users, LogOut, Plus, AlertTriangle, Paperclip, Trash2, Lock, User, UserPlus, Eye, DownloadCloud, Edit, CheckCircle, Filter, Bell, ChevronRight } from 'lucide-react';

// URL de producción configurada en Railway
const API_URL = "https://control-auditorias-asach-production.up.railway.app";

const formatTime = (mins) => {
  if (mins === undefined || mins === null || isNaN(mins)) return "00:00";
  const isNegative = mins < 0;
  const absMins = Math.abs(mins);
  const h = Math.floor(absMins / 60);
  const m = absMins % 60;
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
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full border rounded-lg py-2 pl-10 pr-3 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full border rounded-lg py-2 pl-10 pr-3 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <button type="submit" className="w-full bg-yellow-400 text-blue-900 font-bold py-3 rounded-lg hover:bg-yellow-500 transition shadow-lg mt-4">Iniciar Sesión</button>
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
  const themeBorder = isAdmin ? 'border-teal-700' : 'border-blue-800';
  const themeText = isAdmin ? 'text-teal-800' : 'text-blue-900';
  const themeTextLight = isAdmin ? 'text-teal-200' : 'text-blue-300';
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({ generadas: 0, compensadas: 0, pendientes: 0, auditores: 0, porAprobar: 0 });
  
  const [registros, setRegistros] = useState([]);
  const [compensaciones, setCompensaciones] = useState([]);
  const [usuariosDB, setUsuariosDB] = useState([]);

  // Filtros Dashboard
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

  // Estado para el menú desplegable de notificaciones
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  const [archivo, setArchivo] = useState(null);
  const [intervinientes, setIntervinientes] = useState([]);

  const [formData, setFormData] = useState({ fecha: new Date().toISOString().split('T')[0], hora_inicio: '', hora_termino: '', motivo: 'Auditoría', actividad: '', departamento: user.departamento });
  const [compData, setCompData] = useState({ fecha: new Date().toISOString().split('T')[0], horas: '', motivo: 'Salida anticipada', observaciones: '', usuario_id: '' });
  
  // Estados para creación de usuario con confirmación de contraseña y warnings
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
        
        aplicarFiltrosDashboard(regsConEvidencia || [], est.compensacionesCompletas || [], est.usuarios || []);
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

  const agregarInterviniente = () => setIntervinientes([...intervinientes, { nombre: '', cargo: '', participacion: 'Participante' }]);
  const actualizarInterviniente = (index, campo, valor) => { const nuevos = [...intervinientes]; nuevos[index][campo] = valor; setIntervinientes(nuevos); };
  const eliminarInterviniente = (index) => setIntervinientes(intervinientes.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const minutos = (formData.hora_inicio && formData.hora_termino) ? calcularMinutos() : 0;
    
    let nuevoEstado = editingEstado;
    if (editingEstado === 'Autorizado' && minutos > 0) {
        nuevoEstado = 'Aprobado';
    }

    const payload = { ...formData, horas_generadas_minutos: minutos, usuario_id: user.id, intervinientes, estado: nuevoEstado };
    let regId = editingId;

    if (editingId) {
        await fetch(`${API_URL}/api/registros/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } else {
        const resReg = await fetch(`${API_URL}/api/registros`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const dataReg = await resReg.json();
        regId = dataReg.id;
    }

    if (archivo && regId) {
      const formDataFile = new FormData();
      formDataFile.append('archivo', archivo);
      formDataFile.append('registro_id', regId);
      await fetch(`${API_URL}/api/evidencias`, { method: 'POST', body: formDataFile });
    }
    
    cerrarModalRegistro();
    fetchData();
  };

  const cerrarModalRegistro = () => {
      setShowModal(false); setEditingId(null); setEditingEstado('Pendiente'); setIntervinientes([]); setArchivo(null);
      setFormData({ fecha: new Date().toISOString().split('T')[0], hora_inicio: '', hora_termino: '', motivo: 'Auditoría', actividad: '', departamento: user.departamento });
  };

  const handleCompSubmit = async (e) => {
    e.preventDefault();
    if(!compData.usuario_id) return alert("Por favor, seleccione el auditor.");
    const [h, m] = compData.horas.split(':').map(Number);
    const totalMinutos = (h * 60) + (m || 0);

    const uId = Number(compData.usuario_id);
    let totalGen = 0, totalComp = 0;
    rawRegistros.forEach(r => { if(Number(r.usuario_id) === uId && r.estado === 'Aprobado') totalGen += (r.horas_generadas_minutos || 0); });
    rawCompensaciones.forEach(c => { if(Number(c.usuario_id) === uId) totalComp += (c.horas_compensadas_minutos || 0); });
    const saldoRealMinutos = totalGen - totalComp;

    if (totalMinutos > saldoRealMinutos) return alert(`⚠️ Las horas a descontar superan el saldo pendiente de este auditor (${formatTime(saldoRealMinutos)} hrs disponibles).`);
    
    await fetch(`${API_URL}/api/compensaciones`, { 
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...compData, horas_compensadas_minutos: totalMinutos }) 
    });
    
    setShowModalComp(false); setCompData({ fecha: new Date().toISOString().split('T')[0], horas: '', motivo: 'Salida anticipada', observaciones: '', usuario_id: '' }); fetchData();
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    setUserError('');

    if (userData.password !== userData.confirmPassword) {
        setUserError('⚠️ Las contraseñas no coinciden. Por favor, verifíquelas.');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/usuarios`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({
                nombre: userData.nombre,
                email: userData.email,
                password: userData.password,
                cargo: userData.cargo,
                departamento: userData.departamento,
                rol: userData.rol
            }) 
        });
        const data = await res.json();
        if (!res.ok) {
            setUserError(`⚠️ ${data.error || 'Error al registrar usuario'}`);
            return;
        }

        setShowModalUser(false); 
        setUserData({ nombre: '', email: '', password: '', confirmPassword: '', cargo: '', departamento: '', rol: 'Auditor' }); 
        fetchData();
    } catch(err) {
        setUserError('⚠️ Error de conexión con el servidor.');
    }
  };

  const renderBadgeEstado = (estado) => {
      switch(estado) {
          case 'Aprobado':
              return <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-800">Aprobado</span>;
          case 'Autorizado':
              return <span className="px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-800">Autorizado (Pendiente de Ejecución)</span>;
          case 'Rechazado':
              return <span className="px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-800">Rechazado</span>;
          default:
              return <span className="px-2 py-1 rounded text-xs font-bold bg-yellow-100 text-yellow-800">Pendiente Autorización</span>;
      }
  };

  const menuClass = (tab) => `flex items-center gap-3 p-3 w-full rounded-lg transition text-left ${activeTab === tab ? themeActive : themeHover}`;

  const renderContent = () => {
    if (activeTab === 'dashboard') {
      return (
        <div className="space-y-6">
          {stats.pendientes < 0 && <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded flex items-center gap-3"><AlertTriangle className="text-red-500" /><p className="text-red-700 font-medium">Hay <strong>{formatTime(stats.pendientes)} horas de déficit</strong> en el periodo seleccionado.</p></div>}
          
          {isAdmin && (
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-700 font-bold">
                      <Filter size={18} className="text-teal-700"/> <span>Filtros del Dashboard:</span>
                  </div>
                  <div className="flex flex-wrap gap-3 items-center">
                      <select value={dashFiltroAnio} onChange={e => setDashFiltroAnio(e.target.value)} className="border rounded-lg p-2 text-sm bg-gray-50 outline-none">
                          <option value="todos">📅 Todos los Años</option>
                          <option value="2025">2025</option>
                          <option value="2026">2026</option>
                          <option value="2027">2027</option>
                      </select>

                      <select value={dashFiltroMes} onChange={e => setDashFiltroMes(e.target.value)} className="border rounded-lg p-2 text-sm bg-gray-50 outline-none">
                          <option value="todos">📆 Todos los Meses</option>
                          <option value="01">Enero</option><option value="02">Febrero</option><option value="03">Marzo</option>
                          <option value="04">Abril</option><option value="05">Mayo</option><option value="06">Junio</option>
                          <option value="07">Julio</option><option value="08">Agosto</option><option value="09">Septiembre</option>
                          <option value="10">Octubre</option><option value="11">Noviembre</option><option value="12">Diciembre</option>
                      </select>

                      <select value={dashFiltroUsuario} onChange={e => setDashFiltroUsuario(e.target.value)} className="border rounded-lg p-2 text-sm bg-gray-50 outline-none">
                          <option value="todos">👥 Todos los Auditores</option>
                          {usuariosDB.map(u => (
                              <option key={u.id} value={u.id}>{u.nombre}</option>
                          ))}
                      </select>

                      {(dashFiltroAnio !== 'todos' || dashFiltroMes !== 'todos' || dashFiltroUsuario !== 'todos') && (
                          <button onClick={() => { setDashFiltroAnio('todos'); setDashFiltroMes('todos'); setDashFiltroUsuario('todos'); }} className="text-xs bg-red-100 text-red-700 px-3 py-2 rounded-lg font-bold hover:bg-red-200">
                              Limpiar Filtros
                          </button>
                      )}
                  </div>
              </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"><p className="text-gray-500 text-sm font-medium">Aprobadas</p><h2 className={`text-3xl font-bold mt-1 ${themeText}`}>{formatTime(stats.generadas)}</h2></div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"><p className="text-gray-500 text-sm font-medium">Compensadas</p><h2 className="text-3xl font-bold text-green-600 mt-1">{formatTime(stats.compensadas)}</h2></div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"><p className="text-gray-500 text-sm font-medium">Saldo (A favor)</p><h2 className="text-3xl font-bold text-blue-600 mt-1">{formatTime(stats.pendientes)}</h2></div>
            <div className="bg-yellow-50 p-4 rounded-xl shadow-sm border border-yellow-200"><p className="text-yellow-700 text-sm font-medium">En Propuesta</p><h2 className="text-3xl font-bold text-yellow-600 mt-1">{registros.filter(r => r.estado === 'Pendiente').length}</h2></div>
            {isAdmin ? (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"><p className="text-gray-500 text-sm font-medium">Auditores Activos</p><h2 className="text-3xl font-bold text-gray-800 mt-1">{stats.auditores}</h2></div>
            ) : (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"><p className="text-gray-500 text-sm font-medium">Mis Registros</p><h2 className="text-3xl font-bold text-gray-800 mt-1">{registros.length}</h2></div>
            )}
          </div>

          {/* TABLA DEL DASHBOARD */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-8">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center"><h3 className="font-bold text-gray-800">Trabajos Registrados (Filtrados)</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead><tr className="bg-white border-b text-sm text-gray-500"><th className="p-4">Fecha / Horario Propuesto</th>{isAdmin && <th className="p-4">Auditor</th>}<th className="p-4">Actividad Propuesta</th><th className="p-4">Horas Realizadas</th><th className="p-4">Estado</th><th className="p-4 text-center">Acción</th></tr></thead>
                <tbody>
                  {registros.length === 0 ? (<tr><td colSpan="6" className="p-4 text-center text-gray-500">No hay registros para este filtro</td></tr>) : registros.map(r => (
                    <tr key={r.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <div className="font-medium text-gray-800">{r.fecha}</div>
                        <div className="text-xs text-gray-500">{r.hora_inicio && r.hora_termino ? `⏰ ${r.hora_inicio} a ${r.hora_termino}` : 'Sin horario especificado'}</div>
                      </td>
                      {isAdmin && <td className="p-4 font-medium">{r.auditor}</td>}
                      <td className="p-4 text-sm truncate max-w-xs">
                          {r.actividad} 
                          {Number(r.tiene_evidencia) > 0 && <Paperclip size={14} className={`inline ${themeText} ml-1`} title="Tiene adjunto" />} 
                          {Number(r.total_intervinientes) > 0 && <span className="inline-flex items-center gap-1 ml-2 text-gray-500 text-xs"><Users size={14}/> {r.total_intervinientes}</span>}
                      </td>
                      <td className="p-4 font-bold text-gray-700">{formatTime(r.horas_generadas_minutos)}</td>
                      <td className="p-4">{renderBadgeEstado(r.estado)}</td>
                      <td className="p-4 flex justify-center gap-2">
                          <button onClick={() => verDetallesRegistro(r.id)} className="text-gray-500 hover:text-blue-600 transition" title="Ver Detalle"><Eye size={18} /></button>
                          
                          {(isAdmin || r.estado === 'Autorizado' || r.estado === 'Pendiente') && (
                              <button onClick={() => abrirEdicion(r)} className="text-gray-500 hover:text-blue-600 transition" title={r.estado === 'Autorizado' ? "Rellenar Actividad y Horas" : "Editar / Corregir"}><Edit size={18} /></button>
                          )}

                          {isAdmin && r.estado === 'Pendiente' && (
                              <>
                                  <button onClick={() => cambiarEstado(r.id, 'Autorizado')} className="text-blue-600 hover:text-blue-800 transition font-medium text-xs bg-blue-50 px-2 py-1 rounded border border-blue-200" title="Autorizar actividad al auditor">Autorizar</button>
                                  <button onClick={() => cambiarEstado(r.id, 'Rechazado')} className="text-red-600 hover:text-red-800 transition font-medium text-xs bg-red-50 px-2 py-1 rounded border border-red-200" title="Rechazar propuesta">Rechazar</button>
                              </>
                          )}

                          {isAdmin && r.estado === 'Autorizado' && r.horas_generadas_minutos > 0 && (
                              <button onClick={() => cambiarEstado(r.id, 'Aprobado')} className="text-green-600 hover:text-green-800 transition" title="Aprobar Horas Ejecutadas"><CheckCircle size={18} /></button>
                          )}
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center"><h3 className="font-bold text-gray-800">Todos los Trabajos (Historial General)</h3></div>
                <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead><tr className="bg-white border-b text-sm text-gray-500"><th className="p-4">Fecha / Horario</th>{isAdmin && <th className="p-4">Auditor</th>}<th className="p-4">Actividad Propuesta</th><th className="p-4">Horas</th><th className="p-4">Estado</th><th className="p-4 text-center">Acción</th></tr></thead>
                    <tbody>
                    {rawRegistros.length === 0 ? (<tr><td colSpan="6" className="p-4 text-center text-gray-500">No hay registros</td></tr>) : rawRegistros.map(r => (
                        <tr key={r.id} className="border-b hover:bg-gray-50">
                        <td className="p-4">
                          <div className="font-medium text-gray-800">{r.fecha}</div>
                          <div className="text-xs text-gray-500">{r.hora_inicio && r.hora_termino ? `⏰ ${r.hora_inicio} a ${r.hora_termino}` : 'Sin horario'}</div>
                        </td>
                        {isAdmin && <td className="p-4 font-medium">{r.auditor}</td>}
                        <td className="p-4 text-sm truncate max-w-xs">
                            {r.actividad} 
                            {Number(r.tiene_evidencia) > 0 && <Paperclip size={14} className={`inline ${themeText} ml-1`} title="Tiene adjunto" />} 
                            {Number(r.total_intervinientes) > 0 && <span className="inline-flex items-center gap-1 ml-2 text-gray-500 text-xs"><Users size={14}/> {r.total_intervinientes}</span>}
                        </td>
                        <td className="p-4 font-bold text-gray-700">{formatTime(r.horas_generadas_minutos)}</td>
                        <td className="p-4">{renderBadgeEstado(r.estado)}</td>
                        <td className="p-4 flex justify-center gap-2">
                            <button onClick={() => verDetallesRegistro(r.id)} className="text-gray-500 hover:text-blue-600 transition" title="Ver Detalle"><Eye size={18} /></button>
                            {(isAdmin || r.estado === 'Autorizado' || r.estado === 'Pendiente') && (
                                <button onClick={() => abrirEdicion(r)} className="text-gray-500 hover:text