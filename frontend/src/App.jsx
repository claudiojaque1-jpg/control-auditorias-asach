import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LayoutDashboard, Clock, FileText, Users, LogOut, Plus, AlertTriangle, Paperclip, Trash2, Lock, User, UserPlus, Eye, DownloadCloud, Edit, CheckCircle, Filter, Bell, ChevronRight } from 'lucide-react';

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
      const res = await fetch('http://localhost:3001/api/login', {
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
      setError('Error de conexión con el servidor');
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
        const resUsers = await fetch('http://localhost:3001/api/usuarios');
        if(resUsers.ok) setUsuariosDB(await resUsers.json());
      }

      const resEst = await fetch(`http://localhost:3001/api/estadisticas/completas${queryParams}`);
      if(resEst.ok) {
        const est = await resEst.json();
        
        const resRegs = await fetch(`http://localhost:3001/api/registros/ultimos${queryParams}`);
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
        const res = await fetch(`http://localhost:3001/api/registros/${id}`);
        if(res.ok) setRegistroDetalle(await res.json());
    } catch(err) { alert("⚠️ Error de conexión."); }
  };

  const abrirEdicion = async (r) => {
      setEditingId(r.id);
      setEditingEstado(r.estado);
      setFormData({ fecha: r.fecha, hora_inicio: r.hora_inicio || '', hora_termino: r.hora_termino || '', motivo: r.motivo, actividad: r.actividad, departamento: r.departamento || user.departamento });
      try {
          const res = await fetch(`http://localhost:3001/api/registros/${r.id}`);
          if(res.ok) {
              const data = await res.json();
              setIntervinientes(data.intervinientes || []);
          }
      } catch(e) {}
      setShowModal(true);
  };

  const cambiarEstado = async (id, nuevoEstado) => {
      await fetch(`http://localhost:3001/api/registros/${id}/estado`, {
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
        await fetch(`http://localhost:3001/api/registros/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } else {
        const resReg = await fetch('http://localhost:3001/api/registros', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const dataReg = await resReg.json();
        regId = dataReg.id;
    }

    if (archivo && regId) {
      const formDataFile = new FormData();
      formDataFile.append('archivo', archivo);
      formDataFile.append('registro_id', regId);
      await fetch('http://localhost:3001/api/evidencias', { method: 'POST', body: formDataFile });
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
    
    await fetch('http://localhost:3001/api/compensaciones', { 
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
        const res = await fetch('http://localhost:3001/api/usuarios', { 
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
                                <button onClick={() => abrirEdicion(r)} className="text-gray-500 hover:text-blue-600 transition" title="Editar / Rellenar"><Edit size={18} /></button>
                            )}
                            {isAdmin && r.estado === 'Pendiente' && (
                                <>
                                    <button onClick={() => cambiarEstado(r.id, 'Autorizado')} className="text-blue-600 hover:text-blue-800 transition font-medium text-xs bg-blue-50 px-2 py-1 rounded border border-blue-200">Autorizar</button>
                                    <button onClick={() => cambiarEstado(r.id, 'Rechazado')} className="text-red-600 hover:text-red-800 transition font-medium text-xs bg-red-50 px-2 py-1 rounded border border-red-200">Rechazar</button>
                                </>
                            )}
                            {isAdmin && r.estado === 'Autorizado' && r.horas_generadas_minutos > 0 && (
                                <button onClick={() => cambiarEstado(r.id, 'Aprobado')} className="text-green-600 hover:text-green-800 transition"><CheckCircle size={18} /></button>
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

    if (activeTab === 'compensaciones') {
      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div><h2 className="text-lg font-bold text-gray-800">Historial de Compensaciones</h2><p className="text-sm text-gray-500">Visualiza los descuentos aplicados</p></div>
            {isAdmin && <button onClick={() => setShowModalComp(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 flex gap-2"><Plus size={18} /> Registrar Compensación</button>}
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-white border-b text-sm text-gray-500"><th className="p-4">Fecha</th>{isAdmin && <th className="p-4">Auditor</th>}<th className="p-4">Motivo</th><th className="p-4">Horas</th></tr></thead>
              <tbody>
                {compensaciones.length === 0 ? (<tr><td colSpan="4" className="p-4 text-center text-gray-500">No hay compensaciones</td></tr>) : compensaciones.map(c => (
                  <tr key={c.id} className="border-b hover:bg-gray-50"><td className="p-4">{c.fecha}</td>{isAdmin && <td className="p-4 font-medium">{c.auditor}</td>}<td className="p-4 text-sm">{c.motivo}</td><td className="p-4 font-bold text-red-600">-{formatTime(c.horas_compensadas_minutos).replace('-', '')}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (activeTab === 'usuarios' && isAdmin) {
      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div><h2 className="text-lg font-bold text-gray-800">Administración de Usuarios</h2><p className="text-sm text-gray-500">Gestiona los accesos a la plataforma</p></div>
            <button onClick={() => { setUserError(''); setShowModalUser(true); }} className={`${themeBg} text-white px-4 py-2 rounded-lg font-medium ${themeHover} flex gap-2 transition`}><UserPlus size={18} /> Nuevo Usuario</button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-white border-b text-sm text-gray-500"><th className="p-4">Nombre</th><th className="p-4">Correo (Login)</th><th className="p-4">Cargo / Depto</th><th className="p-4">Rol</th></tr></thead>
              <tbody>
                {usuariosDB.map(u => (
                  <tr key={u.id} className="border-b hover:bg-gray-50"><td className="p-4 font-medium">{u.nombre}</td><td className="p-4 text-gray-600">{u.email}</td><td className="p-4 text-sm">{u.cargo} - {u.departamento}</td><td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${u.rol === 'Administrador' ? 'bg-teal-100 text-teal-800' : 'bg-gray-100 text-gray-800'}`}>{u.rol}</span></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <aside className={`w-64 text-white hidden md:flex flex-col ${themeBg} transition-colors duration-300`}>
        <div className={`p-6 border-b ${themeBorder} text-center flex flex-col items-center`}>
          <div className="bg-white p-2 rounded-full inline-block mb-3 shadow-md"><img src={LOGO_URL} alt="Logo ASACh" className="w-10 h-10 object-contain" /></div>
          <h2 className="text-lg font-bold leading-tight">AUDITORÍAS ASACh</h2>
          <p className={`text-xs mt-1 ${themeTextLight}`}>{isAdmin ? 'Panel de Administración' : 'Portal Auditor'}</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={menuClass('dashboard')}><LayoutDashboard size={20} /> Dashboard Visual</button>
          <button onClick={() => setActiveTab('registros')} className={menuClass('registros')}><Clock size={20} /> Tablas de Registros</button>
          <button onClick={() => setActiveTab('compensaciones')} className={menuClass('compensaciones')}><FileText size={20} /> Compensaciones</button>
          {isAdmin && <button onClick={() => setActiveTab('usuarios')} className={menuClass('usuarios')}><Users size={20} /> Usuarios</button>}
        </nav>
        <div className={`p-4 border-t ${themeBorder}`}><button onClick={onLogout} className={`flex items-center gap-3 p-2 w-full rounded-lg transition ${themeHover}`}><LogOut size={20} /> Cerrar Sesión</button></div>
      </aside>

      <main className="flex-1 overflow-y-auto relative" onClick={() => setShowNotificationsDropdown(false)}>
        <header className="bg-white shadow-sm p-4 md:p-6 flex justify-between items-center mb-6 sticky top-0 z-40">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Hola, {user.nombre.split(' ')[0]}</h1>
            <p className="text-gray-500 text-sm">Sistema de Control de Auditorías de remesa ASACh</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* NOTIFICACIÓN CON CAMPANA Y MENÚ DESPLEGABLE FILTRADO SIN DUPLICADOS */}
            {isAdmin && (() => {
                const pendientesUnicas = rawRegistros.filter((r, index, self) => 
                    r.estado === 'Pendiente' && index === self.findIndex((t) => t.id === r.id)
                );
                const count = pendientesUnicas.length;
                return (
                    <div className="relative" onClick={e => e.stopPropagation()}>
                        <button 
                            onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                            className={`p-2.5 rounded-full border transition relative flex items-center justify-center ${
                                count > 0 
                                    ? 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100' 
                                    : 'bg-gray-50 border-gray-200 text-gray-400'
                            }`}
                            title={count > 0 ? `Tienes ${count} solicitud(es) por autorizar` : 'Sin notificaciones pendientes'}
                        >
                            <Bell size={20} className={count > 0 ? 'animate-bounce' : ''} />
                            {count > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-md animate-pulse">
                                    {count}
                                </span>
                            )}
                        </button>

                        {/* MENÚ DESPLEGABLE DE NOTIFICACIONES */}
                        {showNotificationsDropdown && (
                            <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fadeIn">
                                <div className={`${themeBg} text-white p-3.5 flex justify-between items-center font-bold text-sm`}>
                                    <span className="flex items-center gap-2"><Bell size={16}/> Solicitudes por Autorizar</span>
                                    <span className="bg-yellow-400 text-blue-900 text-xs px-2 py-0.5 rounded-full font-extrabold">{count} nuevas</span>
                                </div>
                                <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                                    {count === 0 ? (
                                        <div className="p-6 text-center text-gray-400 text-sm italic">No hay solicitudes pendientes en este momento.</div>
                                    ) : (
                                        pendientesUnicas.map(req => (
                                            <div key={req.id} onClick={() => { setShowNotificationsDropdown(false); setActiveTab('dashboard'); verDetallesRegistro(req.id); }} className="p-3.5 hover:bg-gray-50 transition cursor-pointer flex items-center justify-between group">
                                                <div className="space-y-1 pr-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded">{req.motivo}</span>
                                                        <span className="text-xs text-gray-400">{req.fecha}</span>
                                                    </div>
                                                    <p className="text-xs font-bold text-gray-800">{req.auditor || 'Auditor'}</p>
                                                    <p className="text-xs text-blue-900 font-semibold">{req.hora_inicio && req.hora_termino ? `⏰ Horario propuesto: ${req.hora_inicio} - ${req.hora_termino}` : '⏰ Horario por definir'}</p>
                                                    <p className="text-xs text-gray-600 line-clamp-1">{req.actividad}</p>
                                                </div>
                                                <div className="text-gray-400 group-hover:text-teal-700 transition">
                                                    <ChevronRight size={18} />
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                {count > 0 && (
                                    <div className="p-2.5 bg-gray-50 border-t text-center">
                                        <button onClick={() => { setShowNotificationsDropdown(false); setActiveTab('dashboard'); }} className="text-xs font-bold text-teal-800 hover:underline">Ver todas en el panel principal</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })()}

            <button onClick={() => { setEditingId(null); setEditingEstado('Pendiente'); setFormData({ fecha: new Date().toISOString().split('T')[0], hora_inicio: '', hora_termino: '', motivo: 'Auditoría', actividad: '', departamento: user.departamento }); setShowModal(true); }} className="flex items-center gap-2 bg-yellow-400 text-blue-900 px-4 py-2 rounded-lg font-semibold shadow hover:bg-yellow-500">
                <Plus size={20} /> NUEVA PROPUESTA
            </button>
          </div>
        </header>
        <div className="px-4 md:px-6 pb-6">{renderContent()}</div>
      </main>

      {/* MODAL DETALLES */}
      {registroDetalle && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
              <div className="bg-white rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                  <div className={`${themeBg} text-white p-4 font-bold flex justify-between items-center`}>
                      <span className="flex items-center gap-2"><FileText size={18}/> Detalle del Registro #{registroDetalle.id}</span>
                      <button onClick={() => setRegistroDetalle(null)} className="hover:text-gray-300">✕</button>
                  </div>
                  <div className="p-6 overflow-y-auto space-y-6">
                      <div className="grid grid-cols-2 gap-4 border-b pb-4">
                          <div><p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Auditor a cargo</p><p className="font-medium text-gray-800">{registroDetalle.auditor}</p><p className="text-sm text-gray-500">{registroDetalle.cargo}</p></div>
                          <div><p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Estado y Horario Propuesto</p><p className="font-medium text-gray-800">{renderBadgeEstado(registroDetalle.estado)}</p><p className="text-sm text-gray-500">{registroDetalle.hora_inicio ? `${registroDetalle.hora_inicio} a ${registroDetalle.hora_termino} (${formatTime(registroDetalle.horas_generadas_minutos)} hrs)` : 'Horario no especificado'}</p></div>
                      </div>
                      <div>
                          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Actividad Propuesta ({registroDetalle.motivo})</p>
                          <div className="bg-gray-50 p-4 rounded-lg border text-sm text-gray-700 whitespace-pre-wrap">{registroDetalle.actividad}</div>
                      </div>
                      {registroDetalle.intervinientes && registroDetalle.intervinientes.length > 0 && (
                          <div>
                              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-2"><Users size={14}/> Intervinientes</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {registroDetalle.intervinientes.map(inv => (
                                      <div key={inv.id} className="bg-white border rounded p-3 flex flex-col shadow-sm"><span className="font-medium text-sm text-gray-800">{inv.nombre}</span><span className="text-xs text-gray-500">{inv.cargo} • {inv.participacion}</span></div>
                                  ))}
                              </div>
                          </div>
                      )}
                      {registroDetalle.evidencias && registroDetalle.evidencias.length > 0 && (
                          <div>
                              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-2"><Paperclip size={14}/> Evidencia Adjunta</p>
                              <div className="flex flex-col gap-2">
                                  {registroDetalle.evidencias.map(ev => (
                                      <a key={ev.id} href={`http://localhost:3001${ev.archivo_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg border transition hover:bg-gray-100 group bg-gray-50 text-gray-800"><div className="p-2 rounded bg-white text-gray-600 shadow-sm"><DownloadCloud size={20}/></div><div className="flex-1 truncate"><p className="text-sm font-medium truncate">{ev.nombre_archivo}</p></div></a>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
                  <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                      {isAdmin && registroDetalle.estado === 'Pendiente' && (
                          <>
                              <button onClick={() => { cambiarEstado(registroDetalle.id, 'Autorizado'); setRegistroDetalle(null); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-blue-700">Autorizar Actividad</button>
                              <button onClick={() => { cambiarEstado(registroDetalle.id, 'Rechazado'); setRegistroDetalle(null); }} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-red-700">Rechazar</button>
                          </>
                      )}
                      <button onClick={() => setRegistroDetalle(null)} className="px-5 py-2 border rounded-lg bg-white text-gray-700 hover:bg-gray-100 font-medium shadow-sm">Cerrar Detalle</button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL CREAR PROPUESTA O EJECUTAR ACTIVIDAD */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl max-h-[95vh] flex flex-col">
            <div className={`${themeBg} text-white p-4 font-bold flex justify-between`}>
                <span>{editingEstado === 'Autorizado' ? 'Completar Ejecución de Actividad' : (editingId ? 'Editar Propuesta' : 'Nueva Actividad Propuesta')}</span>
                <button onClick={cerrarModalRegistro}>✕</button>
            </div>
            <div className="overflow-y-auto p-6 flex-1">
              <form id="registroForm" onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1">Fecha Programada</label><input type="date" required value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} className="w-full border rounded p-2" /></div>
                  <div>
                      <label className="block text-sm font-medium mb-1">Motivo / Tipo</label>
                      <select value={formData.motivo} onChange={e => setFormData({...formData, motivo: e.target.value})} className="w-full border rounded p-2">
                          <option value="Auditoría">Auditoría</option>
                          <option value="Cambio de Tesorero">Cambio de Tesorero</option>
                          <option value="Capacitación">Capacitación</option>
                          <option value="Urgencia">Urgencia</option>
                      </select>
                  </div>
                </div>

                {/* HORARIO PROPUESTO DISPONIBLE DESDE LA CREACIÓN */}
                <div className="grid grid-cols-2 gap-4 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                  <div>
                    <label className="block text-sm font-medium text-blue-950 mb-1">Hora Inicio Estimada</label>
                    <input type="time" required value={formData.hora_inicio} onChange={e => setFormData({...formData, hora_inicio: e.target.value})} className="w-full border rounded p-2 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-950 mb-1">Hora Término Estimada</label>
                    <input type="time" required value={formData.hora_termino} onChange={e => setFormData({...formData, hora_termino: e.target.value})} className="w-full border rounded p-2 bg-white" />
                  </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Actividad Propuesta / Detalle</label>
                    <textarea required rows="3" placeholder="Describa la actividad propuesta..." value={formData.actividad} onChange={e => setFormData({...formData, actividad: e.target.value})} className="w-full border rounded p-2"></textarea>
                </div>

                {(editingEstado === 'Autorizado' || editingEstado === 'Aprobado' || isAdmin) && (
                    <div className="border-t pt-4 space-y-4">
                        <p className="text-xs font-bold text-blue-900 uppercase tracking-wider">Ejecución y Cierre de Actividad</p>

                        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div className="flex justify-between items-center mb-3"><label className="block text-sm font-bold text-gray-700 flex items-center gap-2"><Users size={16}/> Intervinientes</label><button type="button" onClick={agregarInterviniente} className="text-xs bg-white border border-gray-300 px-2 py-1 rounded hover:bg-gray-100 flex items-center gap-1"><Plus size={14}/> Agregar persona</button></div>
                          {intervinientes.map((inv, idx) => (
                            <div key={idx} className="flex gap-2 items-center bg-white p-2 rounded border shadow-sm mb-2">
                              <input type="text" placeholder="Nombre completo" required value={inv.nombre} onChange={e => actualizarInterviniente(idx, 'nombre', e.target.value)} className="w-1/3 border rounded p-1 text-sm" />
                              <input type="text" placeholder="Cargo" required value={inv.cargo} onChange={e => actualizarInterviniente(idx, 'cargo', e.target.value)} className="w-1/3 border rounded p-1 text-sm" />
                              <select value={inv.participacion} onChange={e => actualizarInterviniente(idx, 'participacion', e.target.value)} className="w-1/4 border rounded p-1 text-sm"><option>Participante</option><option>Entrevistado</option><option>Testigo</option></select>
                              <button type="button" onClick={() => eliminarInterviniente(idx)} className="text-red-500 p-1"><Trash2 size={16}/></button>
                            </div>
                          ))}
                        </div>

                        <div className="bg-gray-50 p-3 rounded border border-dashed border-gray-300">
                          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2"><Paperclip size={16} /> Adjuntar Evidencia</label>
                          <input type="file" onChange={e => setArchivo(e.target.files[0])} className="w-full text-sm text-gray-500" />
                        </div>
                    </div>
                )}
              </form>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3"><button type="button" onClick={cerrarModalRegistro} className="px-4 py-2 border rounded text-gray-600 bg-white shadow-sm">Cancelar</button><button type="submit" form="registroForm" className={`px-4 py-2 ${themeBg} text-white rounded font-medium shadow-sm`}>{editingEstado === 'Autorizado' ? 'Guardar y Finalizar' : (editingId ? 'Guardar Cambios' : 'Enviar Propuesta')}</button></div>
          </div>
        </div>
      )}

      {/* MODAL COMPENSACIÓN */}
      {showModalComp && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="bg-green-600 text-white p-4 font-bold flex justify-between"><span>Registrar Compensación</span><button onClick={() => setShowModalComp(false)}>✕</button></div>
            <form onSubmit={handleCompSubmit} className="p-6 space-y-4">
              <div className="bg-green-50 p-4 rounded border border-green-200">
                <label className="block text-sm font-bold text-green-900 mb-2">Asignar descuento a:</label>
                <select required value={compData.usuario_id} onChange={e => setCompData({...compData, usuario_id: e.target.value})} className="w-full border border-green-300 rounded p-2 bg-white outline-none">
                    <option value="">-- Elija un usuario --</option>
                    {usuariosDB.map(u => (<option key={u.id} value={u.id}>{u.nombre} ({u.cargo})</option>))}
                </select>
                {compData.usuario_id && (() => {
                    const uId = Number(compData.usuario_id);
                    let totalGen = 0, totalComp = 0;
                    rawRegistros.forEach(r => { if(Number(r.usuario_id) === uId && r.estado === 'Aprobado') totalGen += (r.horas_generadas_minutos || 0); });
                    rawCompensaciones.forEach(c => { if(Number(c.usuario_id) === uId) totalComp += (c.horas_compensadas_minutos || 0); });
                    const saldoRealMinutos = totalGen - totalComp;

                    return (
                        <div className="mt-3 text-sm text-green-800 bg-white p-2 rounded border border-green-100 text-center shadow-sm">
                          Saldo total disponible: <strong className="text-lg text-green-700">{formatTime(saldoRealMinutos)} hrs</strong>
                        </div>
                    );
                })()}
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div><label className="block text-sm font-medium mb-1">Fecha</label><input type="date" required value={compData.fecha} onChange={e => setCompData({...compData, fecha: e.target.value})} className="w-full border rounded p-2" /></div>
                <div><label className="block text-sm font-medium mb-1">Horas a devolver</label><input type="time" required value={compData.horas} onChange={e => setCompData({...compData, horas: e.target.value})} className="w-full border rounded p-2" /></div>
              </div>
              <textarea rows="2" placeholder="Observaciones..." value={compData.observaciones} onChange={e => setCompData({...compData, observaciones: e.target.value})} className="w-full border rounded p-2"></textarea>
              <div className="flex justify-end gap-3 pt-4 border-t"><button type="button" onClick={() => setShowModalComp(false)} className="px-4 py-2 border rounded text-gray-600 shadow-sm">Cancelar</button><button type="submit" className="px-4 py-2 bg-green-600 text-white rounded font-medium shadow-sm">Aprobar y Descontar</button></div>
            </form>
          </div>
        </div>
      )}
      
      {/* MODAL USUARIO CON DOBLE CONTRASEÑA Y VALIDACIÓN DE CORREO */}
      {showModalUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className={`${themeBg} text-white p-4 font-bold flex justify-between`}><span>Crear Nuevo Usuario</span><button onClick={() => setShowModalUser(false)}>✕</button></div>
            <form onSubmit={handleUserSubmit} className="p-6 space-y-4">
              {userError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-200 text-center">{userError}</div>}
              
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Nombre Completo</label><input type="text" required value={userData.nombre} onChange={e => setUserData({...userData, nombre: e.target.value})} className="w-full border rounded p-2" /></div>
                <div><label className="block text-sm font-medium mb-1">Correo (Login)</label><input type="email" required value={userData.email} onChange={e => setUserData({...userData, email: e.target.value})} className="w-full border rounded p-2" placeholder="usuario@asach.cl" /></div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Contraseña</label><input type="password" required value={userData.password} onChange={e => setUserData({...userData, password: e.target.value})} className="w-full border rounded p-2" /></div>
                <div><label className="block text-sm font-medium mb-1">Confirmar Contraseña</label><input type="password" required value={userData.confirmPassword} onChange={e => setUserData({...userData, confirmPassword: e.target.value})} className="w-full border rounded p-2" /></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Cargo</label><input type="text" required value={userData.cargo} onChange={e => setUserData({...userData, cargo: e.target.value})} className="w-full border rounded p-2" /></div>
                <div><label className="block text-sm font-medium mb-1">Departamento</label><input type="text" required value={userData.departamento} onChange={e => setUserData({...userData, departamento: e.target.value})} className="w-full border rounded p-2" /></div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Rol en el sistema</label>
                <select value={userData.rol} onChange={e => setUserData({...userData, rol: e.target.value})} className="w-full border rounded p-2">
                    <option>Auditor</option>
                    <option>Administrador</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowModalUser(false)} className="px-4 py-2 border rounded shadow-sm bg-white text-gray-700">Cancelar</button>
                <button type="submit" className={`px-4 py-2 ${themeBg} text-white rounded font-medium shadow-sm`}>Guardar Usuario</button>
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
  useEffect(() => { const saved = localStorage.getItem('user'); if (saved) setUser(JSON.parse(saved)); }, []);
  const handleLogout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); };
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!user ? <LoginScreen onLogin={setUser} /> : <Navigate to="/" />} />
        <Route path="/" element={user ? <DashboardApp user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}