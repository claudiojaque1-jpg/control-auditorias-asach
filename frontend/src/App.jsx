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

  const [intervinientes, setIntervinientes] = useState([]);

  const [formData, setFormData] = useState({ fecha: new Date().toISOString().split('T')[0], hora_inicio: '', hora_termino: '', motivo: 'Auditoría', actividad: '', departamento: user.departamento });
  const [compData, setCompData] = useState({ fecha: new Date().toISOString().split('T')[0], horas: '', motivo: 'Salida anticipada', observaciones: '', usuario_id: '' });

  // Estados para creación y edición de usuario
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

    if (editingId) {
        await fetch(`${API_URL}/api/registros/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } else {
        await fetch(`${API_URL}/api/registros`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }

    cerrarModalRegistro();
    fetchData();
  };

  const cerrarModalRegistro = () => {
      setShowModal(false); setEditingId(null); setEditingEstado('Pendiente'); setIntervinientes([]);
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

    if (userData.password || !editingUserId) {
      if (userData.password !== userData.confirmPassword) {
          setUserError('⚠️ Las contraseñas no coinciden. Por favor, verifíquelas.');
          return;
      }
    }

    try {
        const url = editingUserId ? `${API_URL}/api/usuarios/${editingUserId}` : `${API_URL}/api/usuarios`;
        const method = editingUserId ? 'PUT' : 'POST';

        const payload = {
            nombre: userData.nombre,
            email: userData.email,
            cargo: userData.cargo,
            departamento: userData.departamento,
            rol: userData.rol
        };

        if (userData.password) {
            payload.password = userData.password;
        }

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
            setUserError(`⚠️ ${data.error || 'Error al guardar usuario'}`);
            return;
        }

        setShowModalUser(false);
        setEditingUserId(null);
        setUserData({ nombre: '', email: '', password: '', confirmPassword: '', cargo: '', departamento: '', rol: 'Auditor' });
        fetchData();
    } catch(err) {
        setUserError('⚠️ Error de conexión con el servidor.');
    }
  };

  const renderBadgeEstado = (estado) => {
      switch(estado) {
          case 'Aprobado':
              return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-green-100 text-green-800">Aprobado</span>;
          case 'Autorizado':
              return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800">Autorizado (Pendiente de Ejecución)</span>;
          case 'Rechazado':
              return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800">Rechazado</span>;
          default:
              return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-yellow-100 text-yellow-800">Pendiente Autorización</span>;
      }
  };

  const menuClass = (tab) => `flex items-center gap-2.5 p-2.5 w-full rounded-lg transition text-left text-xs ${activeTab === tab ? themeActive : themeHover}`;

  const renderContent = () => {
    if (activeTab === 'dashboard') {
      return (
        <div className="space-y-4">
          {stats.pendientes < 0 && <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-xs flex items-center gap-2"><AlertTriangle className="text-red-500" size={16} /><p className="text-red-700 font-medium">Hay <strong>{formatTime(stats.pendientes)} horas de déficit</strong> en el periodo seleccionado.</p></div>}

          {isAdmin && (
              <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-3 items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-gray-700 font-bold">
                      <Filter size={16} className="text-teal-700"/> <span>Filtros del Dashboard:</span>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                      <select value={dashFiltroAnio} onChange={e => setDashFiltroAnio(e.target.value)} className="border rounded-lg p-1.5 text-xs bg-gray-50 outline-none">
                          <option value="todos">📅 Todos los Años</option>
                          <option value="2025">2025</option>
                          <option value="2026">2026</option>
                          <option value="2027">2027</option>
                      </select>

                      <select value={dashFiltroMes} onChange={e => setDashFiltroMes(e.target.value)} className="border rounded-lg p-1.5 text-xs bg-gray-50 outline-none">
                          <option value="todos">📆 Todos los Meses</option>
                          <option value="01">Enero</option><option value="02">Febrero</option><option value="03">Marzo</option>
                          <option value="04">Abril</option><option value="05">Mayo</option><option value="06">Junio</option>
                          <option value="07">Julio</option><option value="08">Agosto</option><option value="09">Septiembre</option>
                          <option value="10">Octubre</option><option value="11">Noviembre</option><option value="12">Diciembre</option>
                      </select>

                      <select value={dashFiltroUsuario} onChange={e => setDashFiltroUsuario(e.target.value)} className="border rounded-lg p-1.5 text-xs bg-gray-50 outline-none">
                          <option value="todos">👥 Todos los Auditores</option>
                          {usuariosDB.map(u => (
                              <option key={u.id} value={u.id}>{u.nombre}</option>
                          ))}
                      </select>

                      {(dashFiltroAnio !== 'todos' || dashFiltroMes !== 'todos' || dashFiltroUsuario !== 'todos') && (
                          <button onClick={() => { setDashFiltroAnio('todos'); setDashFiltroMes('todos'); setDashFiltroUsuario('todos'); }} className="text-[11px] bg-red-100 text-red-700 px-2.5 py-1.5 rounded-lg font-bold hover:bg-red-200">
                              Limpiar Filtros
                          </button>
                      )}
                  </div>
              </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100"><p className="text-gray-500 text-xs font-medium">Aprobadas</p><h2 className={`text-2xl font-bold mt-1 ${themeText}`}>{formatTime(stats.generadas)}</h2></div>
            <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100"><p className="text-gray-500 text-xs font-medium">Compensadas</p><h2 className="text-2xl font-bold text-green-600 mt-1">{formatTime(stats.compensadas)}</h2></div>
            <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100"><p className="text-gray-500 text-xs font-medium">Saldo (A favor)</p><h2 className="text-2xl font-bold text-blue-600 mt-1">{formatTime(stats.pendientes)}</h2></div>
            <div className="bg-yellow-50 p-3.5 rounded-xl shadow-sm border border-yellow-200"><p className="text-yellow-700 text-xs font-medium">En Propuesta</p><h2 className="text-2xl font-bold text-yellow-600 mt-1">{registros.filter(r => r.estado === 'Pendiente').length}</h2></div>
            {isAdmin ? (
                <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100"><p className="text-gray-500 text-xs font-medium">Auditores Activos</p><h2 className="text-2xl font-bold text-gray-800 mt-1">{stats.auditores}</h2></div>
            ) : (
                <div className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100"><p className="text-gray-500 text-xs font-medium">Mis Registros</p><h2 className="text-2xl font-bold text-gray-800 mt-1">{registros.length}</h2></div>
            )}
          </div>

          {/* TABLA DEL DASHBOARD */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
            <div className="p-3.5 border-b border-gray-100 bg-gray-50 flex justify-between items-center"><h3 className="font-bold text-gray-800 text-xs">Trabajos Registrados (Filtrados)</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead><tr className="bg-white border-b text-gray-500"><th className="p-3">Fecha / Horario Propuesto</th>{isAdmin && <th className="p-3">Auditor</th>}<th className="p-3">Actividad Propuesta</th><th className="p-3">Horas Realizadas</th><th className="p-3">Estado</th><th className="p-3 text-center">Acción</th></tr></thead>
                <tbody>
                  {registros.length === 0 ? (<tr><td colSpan="6" className="p-4 text-center text-gray-500">No hay registros para este filtro</td></tr>) : registros.map(r => (
                    <tr key={r.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="font-medium text-gray-800">{r.fecha}</div>
                        <div className="text-[11px] text-gray-500">{r.hora_inicio && r.hora_termino ? `⏰ ${r.hora_inicio} a ${r.hora_termino}` : 'Sin horario especificado'}</div>
                      </td>
                      {isAdmin && <td className="p-3 font-medium">{r.auditor}</td>}
                      <td className="p-3 truncate max-w-xs">
                          {r.actividad}
                          {Number(r.tiene_evidencia) > 0 && <Paperclip size={13} className={`inline ${themeText} ml-1`} title="Tiene adjunto" />}
                          {Number(r.total_intervinientes) > 0 && <span className="inline-flex items-center gap-1 ml-2 text-gray-500 text-[11px]"><Users size={13}/> {r.total_intervinientes}</span>}
                      </td>
                      <td className="p-3 font-bold text-gray-700">{formatTime(r.horas_generadas_minutos)}</td>
                      <td className="p-3">{renderBadgeEstado(r.estado)}</td>
                      <td className="p-3 flex justify-center gap-2">
                          <button onClick={() => verDetallesRegistro(r.id)} className="text-gray-500 hover:text-blue-600 transition" title="Ver Detalle"><Eye size={16} /></button>

                          {(isAdmin || r.estado === 'Autorizado' || r.estado === 'Pendiente') && (
                              <button onClick={() => abrirEdicion(r)} className="text-gray-500 hover:text-blue-600 transition" title={r.estado === 'Autorizado' ? "Rellenar Actividad y Horas" : "Editar / Corregir"}><Edit size={16} /></button>
                          )}

                          {isAdmin && r.estado === 'Pendiente' && (
                              <>
                                  <button onClick={() => cambiarEstado(r.id, 'Autorizado')} className="text-blue-600 hover:text-blue-800 transition font-medium text-[11px] bg-blue-50 px-2 py-1 rounded border border-blue-200" title="Autorizar actividad al auditor">Autorizar</button>
                                  <button onClick={() => cambiarEstado(r.id, 'Rechazado')} className="text-red-600 hover:text-red-800 transition font-medium text-[11px] bg-red-50 px-2 py-1 rounded border border-red-200" title="Rechazar propuesta">Rechazar</button>
                              </>
                          )}

                          {isAdmin && r.estado === 'Autorizado' && r.horas_generadas_minutos > 0 && (
                              <button onClick={() => cambiarEstado(r.id, 'Aprobado')} className="text-green-600 hover:text-green-800 transition" title="Aprobar Horas Ejecutadas"><CheckCircle size={16} /></button>
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden text-xs">
                <div className="p-3.5 border-b border-gray-100 bg-gray-50 flex justify-between items-center"><h3 className="font-bold text-gray-800">Todos los Trabajos (Historial General)</h3></div>
                <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead><tr className="bg-white border-b text-gray-500"><th className="p-3">Fecha / Horario</th>{isAdmin && <th className="p-3">Auditor</th>}<th className="p-3">Actividad Propuesta</th><th className="p-3">Horas</th><th className="p-3">Estado</th><th className="p-3 text-center">Acción</th></tr></thead>
                    <tbody>
                    {rawRegistros.length === 0 ? (<tr><td colSpan="6" className="p-4 text-center text-gray-500">No hay registros</td></tr>) : rawRegistros.map(r => (
                        <tr key={r.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="font-medium text-gray-800">{r.fecha}</div>
                          <div className="text-[11px] text-gray-500">{r.hora_inicio && r.hora_termino ? `⏰ ${r.hora_inicio} a ${r.hora_termino}` : 'Sin horario'}</div>
                        </td>
                        {isAdmin && <td className="p-3 font-medium">{r.auditor}</td>}
                        <td className="p-3 truncate max-w-xs">
                            {r.actividad}
                            {Number(r.tiene_evidencia) > 0 && <Paperclip size={13} className={`inline ${themeText} ml-1`} title="Tiene adjunto" />}
                            {Number(r.total_intervinientes) > 0 && <span className="inline-flex items-center gap-1 ml-2 text-gray-500 text-[11px]"><Users size={13}/> {r.total_intervinientes}</span>}
                        </td>
                        <td className="p-3 font-bold text-gray-700">{formatTime(r.horas_generadas_minutos)}</td>
                        <td className="p-3">{renderBadgeEstado(r.estado)}</td>
                        <td className="p-3 flex justify-center gap-2">
                            <button onClick={() => verDetallesRegistro(r.id)} className="text-gray-500 hover:text-blue-600 transition" title="Ver Detalle"><Eye size={16} /></button>
                            {(isAdmin || r.estado === 'Autorizado' || r.estado === 'Pendiente') && (
                                <button onClick={() => abrirEdicion(r)} className="text-gray-500 hover:text-blue-600 transition" title="Editar / Rellenar"><Edit size={16} /></button>
                            )}
                            {isAdmin && r.estado === 'Pendiente' && (
                                <>
                                    <button onClick={() => cambiarEstado(r.id, 'Autorizado')} className="text-blue-600 hover:text-blue-800 transition font-medium text-[11px] bg-blue-50 px-2 py-1 rounded border border-blue-200">Autorizar</button>
                                    <button onClick={() => cambiarEstado(r.id, 'Rechazado')} className="text-red-600 hover:text-red-800 transition font-medium text-[11px] bg-red-50 px-2 py-1 rounded border border-red-200">Rechazar</button>
                                </>
                            )}
                            {isAdmin && r.estado === 'Autorizado' && r.horas_generadas_minutos > 0 && (
                                <button onClick={() => cambiarEstado(r.id, 'Aprobado')} className="text-green-600 hover:text-green-800 transition"><CheckCircle size={16} /></button>
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
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-3.5 rounded-xl shadow-sm border border-gray-100">
            <div><h2 className="text-base font-bold text-gray-800">Historial de Compensaciones</h2><p className="text-xs text-gray-500">Visualiza los descuentos aplicados</p></div>
            {isAdmin && <button onClick={() => setShowModalComp(true)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 flex gap-1.5 items-center"><Plus size={16} /> Registrar Compensación</button>}
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-white border-b text-gray-500"><th className="p-3">Fecha</th>{isAdmin && <th className="p-3">Auditor</th>}<th className="p-3">Motivo</th><th className="p-3">Horas</th></tr></thead>
              <tbody>
                {compensaciones.length === 0 ? (<tr><td colSpan="4" className="p-4 text-center text-gray-500">No hay compensaciones</td></tr>) : compensaciones.map(c => (
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
            <div><h2 className="text-base font-bold text-gray-800">Administración de Usuarios</h2><p className="text-xs text-gray-500">Gestiona los accesos a la plataforma</p></div>
            <button onClick={abrirCreacionUsuario} className={`${themeBg} text-white px-3 py-1.5 rounded-lg text-xs font-medium ${themeHover} flex gap-1.5 items-center transition`}><UserPlus size={16} /> Nuevo Usuario</button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-white border-b text-gray-500"><th className="p-3">Nombre</th><th className="p-3">Correo (Login)</th><th className="p-3">Cargo / Depto</th><th className="p-3">Rol</th><th className="p-3 text-center">Acción</th></tr></thead>
              <tbody>
                {usuariosDB.map(u => (
                  <tr key={u.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{u.nombre}</td>
                    <td className="p-3 text-gray-600">{u.email}</td>
                    <td className="p-3">{u.cargo} - {u.departamento}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        u.rol === 'Administrador' ? 'bg-teal-100 text-teal-800' :
                        u.rol === 'Analista' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {u.rol}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => abrirEdicionUsuario(u)} className="text-gray-500 hover:text-blue-600 transition" title="Editar Usuario">
                        <Edit size={16} />
                      </button>
                    </td>
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
    <div className="flex h-screen overflow-hidden bg-gray-50 text-xs">
      <aside className={`w-56 text-white hidden md:flex flex-col ${themeBg} transition-colors duration-300`}>
        <div className={`p-4 border-b ${themeBorder} text-center flex flex-col items-center`}>
          <img src={LOGO_URL} alt="Logo" className="w-12 h-12 mx-auto mb-1.5 object-contain bg-white rounded-full p-1" />
          <h2 className="font-bold tracking-wider text-xs">CONTROL AUDITORÍAS</h2>
          <span className="text-[10px] bg-black bg-opacity-20 px-2 py-0.5 rounded mt-1">{user.rol}</span>
        </div>
        <nav className="flex-1 p-3 space-y-1.5">
          <button onClick={() => setActiveTab('dashboard')} className={menuClass('dashboard')}><LayoutDashboard size={17} /> Dashboard</button>
          <button onClick={() => setActiveTab('registros')} className={menuClass('registros')}><FileText size={17} /> Historial Trabajos</button>
          <button onClick={() => setActiveTab('compensaciones')} className={menuClass('compensaciones')}><Clock size={17} /> Compensaciones</button>
          {isAdmin && <button onClick={() => setActiveTab('usuarios')} className={menuClass('usuarios')}><Users size={17} /> Usuarios</button>}
        </nav>
        <div className={`p-3 border-t ${themeBorder}`}>
          <div className="mb-2"><p className="font-medium text-xs truncate">{user.nombre}</p><p className={`text-[11px] ${themeTextLight} truncate`}>{user.departamento}</p></div>
          <button onClick={onLogout} className="flex items-center gap-1.5 text-red-200 hover:text-white transition text-xs w-full pt-2 border-t border-white border-opacity-10"><LogOut size={14} /> Cerrar Sesión</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="bg-white border-b border-gray-200 p-3.5 flex justify-between items-center shadow-sm">
          <h1 className="text-lg font-bold text-gray-800 capitalize">{activeTab}</h1>
          <div className="flex items-center gap-2.5">

            {/* BOTÓN DE NOTIFICACIONES */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition relative flex items-center justify-center shadow-sm"
                title="Solicitudes por Autorizar"
              >
                <Bell size={18} className="text-gray-700" />
                {rawRegistros.filter(r => r.estado === 'Pendiente').length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-extrabold h-4 w-4 rounded-full flex items-center justify-center border-2 border-white shadow">
                    {rawRegistros.filter(r => r.estado === 'Pendiente').length}
                  </span>
                )}
              </button>

              {/* MENÚ DESPLEGABLE DE NOTIFICACIONES */}
              {showNotificationsDropdown && (
                <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden text-xs">

                  <div className="bg-teal-800 p-3 text-white flex justify-between items-center">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <Bell size={16} /> Solicitudes por Autorizar
                    </span>
                    <span className="text-[11px] bg-yellow-400 text-teal-950 px-2 py-0.5 rounded-full font-extrabold shadow-sm">
                      {rawRegistros.filter(r => r.estado === 'Pendiente').length} nuevas
                    </span>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 p-1.5">
                    {rawRegistros.filter(r => r.estado === 'Pendiente').length === 0 ? (
                      <p className="text-[11px] text-gray-400 text-center py-5 font-medium">No hay solicitudes pendientes por autorizar</p>
                    ) : (
                      rawRegistros.filter(r => r.estado === 'Pendiente').map(r => (
                        <div
                          key={r.id}
                          onClick={() => {
                            verDetallesRegistro(r.id);
                            setShowNotificationsDropdown(false);
                          }}
                          className="p-2.5 hover:bg-gray-50 rounded-xl transition cursor-pointer flex justify-between items-center gap-2"
                        >
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-md">
                                {r.motivo || 'Auditoría'}
                              </span>
                              <span className="text-[11px] text-gray-400 font-medium">{r.fecha}</span>
                            </div>
                            <p className="font-bold text-xs text-gray-900 truncate">{r.auditor || 'Auditor'}</p>
                            {r.hora_inicio && r.hora_termino && (
                              <p className="text-[11px] font-semibold text-blue-900 flex items-center gap-1">
                                ⏰ Horario propuesto: {r.hora_inicio} - {r.hora_termino}
                              </p>
                            )}
                            <p className="text-[11px] text-gray-500 truncate">{r.actividad}</p>
                          </div>
                          <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                        </div>
                      ))
                    )}
                  </div>

                  <div className="bg-gray-50 p-2.5 text-center border-t border-gray-100">
                    <button
                      onClick={() => { setActiveTab('dashboard'); setShowNotificationsDropdown(false); }}
                      className="text-[11px] font-bold text-teal-800 hover:text-teal-950 transition"
                    >
                      Ver todas en el panel principal
                    </button>
                  </div>

                </div>
              )}
            </div>

            {/* BOTÓN NUEVO REGISTRO (SOLO VISIBLE EN EL DASHBOARD) */}
            {activeTab === 'dashboard' && (
              <button
                onClick={() => setShowModal(true)}
                className={`${themeBg} text-white px-3.5 py-2 rounded-xl font-medium ${themeHover} flex items-center gap-1.5 transition shadow-md hover:shadow-lg text-xs`}
              >
                <Plus size={16} /> Nuevo Registro
              </button>
            )}

          </div>
        </header>

        <div className="p-4 md:p-5">
          {renderContent()}
        </div>
      </main>

      {/* MODAL NUEVO / EDITAR REGISTRO */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 text-xs">
          <div className="bg-white rounded-2xl p-5 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-base font-bold text-gray-800 mb-3">{editingId ? 'Editar / Rellenar Registro' : 'Registrar Nueva Actividad'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className="block font-medium text-gray-700 mb-1">Fecha</label><input type="date" required value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block font-medium text-gray-700 mb-1">Departamento</label><input type="text" required value={formData.departamento} onChange={e => setFormData({...formData, departamento: e.target.value})} className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className="block font-medium text-gray-700 mb-1">Hora Inicio</label><input type="time" required value={formData.hora_inicio} onChange={e => setFormData({...formData, hora_inicio: e.target.value})} className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block font-medium text-gray-700 mb-1">Hora Término</label><input type="time" required value={formData.hora_termino} onChange={e => setFormData({...formData, hora_termino: e.target.value})} className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" /></div>
              </div>
              <div><label className="block font-medium text-gray-700 mb-1">Motivo</label><select value={formData.motivo} onChange={e => setFormData({...formData, motivo: e.target.value})} className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"><option value="Auditoría">Auditoría</option><option value="Inventario">Inventario</option><option value="Revisión Documental">Revisión Documental</option><option value="Otro">Otro</option></select></div>
              <div><label className="block font-medium text-gray-700 mb-1">Descripción de la Actividad</label><textarea required rows="3" value={formData.actividad} onChange={e => setFormData({...formData, actividad: e.target.value})} className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Detalle el trabajo realizado..."></textarea></div>

              {/* INTERVINIENTES */}
              <div className="border-t pt-3">
                <div className="flex justify-between items-center mb-2">
                  <label className="font-bold text-gray-700">Intervinientes / Acompañantes</label>
                  <button type="button" onClick={agregarInterviniente} className="text-[11px] bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg font-medium hover:bg-blue-100">+ Añadir Interviniente</button>
                </div>
                {intervinientes.map((integ, index) => (
                  <div key={index} className="flex gap-2 items-center mb-2">
                    <input type="text" placeholder="Nombre" value={integ.nombre} onChange={e => actualizarInterviniente(index, 'nombre', e.target.value)} className="w-1/3 border rounded p-1.5 text-xs" />
                    <input type="text" placeholder="Cargo" value={integ.cargo} onChange={e => actualizarInterviniente(index, 'cargo', e.target.value)} className="w-1/3 border rounded p-1.5 text-xs" />
                    <select value={integ.participacion} onChange={e => actualizarInterviniente(index, 'participacion', e.target.value)} className="w-1/4 border rounded p-1.5 text-xs"><option value="Participante">Participante</option><option value="Responsable">Responsable</option></select>
                    <button type="button" onClick={() => eliminarInterviniente(index)} className="text-red-500 hover:text-red-700"><Trash2 size={15}/></button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2.5 pt-3"><button type="button" onClick={cerrarModalRegistro} className="px-3 py-1.5 border rounded-lg text-gray-600 hover:bg-gray-50">Cancelar</button><button type="submit" className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Guardar Registro</button></div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NUEVA COMPENSACIÓN */}
      {showModalComp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 text-xs">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-3 pb-2 border-b">
              <h2 className="text-base font-bold text-gray-800">Registrar Compensación</h2>
              <button onClick={() => setShowModalComp(false)} className="text-gray-400 hover:text-gray-600 transition font-bold text-base">✕</button>
            </div>

            <form onSubmit={handleCompSubmit} className="space-y-3">
              <div className="bg-green-50/60 p-2.5 rounded-xl border border-green-200 space-y-1.5">
                <label className="block font-bold text-green-900">Asignar descuento a:</label>
                <select
                  required
                  value={compData.usuario_id}
                  onChange={e => setCompData({...compData, usuario_id: e.target.value})}
                  className="w-full border rounded-lg p-1.5 outline-none bg-white focus:ring-2 focus:ring-green-500 text-xs"
                >
                  <option value="">Seleccione auditor...</option>
                  {usuariosDB.map(u => (
                    <option key={u.id} value={u.id}>{u.nombre} ({u.cargo})</option>
                  ))}
                </select>

                {compData.usuario_id && (() => {
                  const uId = Number(compData.usuario_id);
                  let totalGen = 0;
                  let totalComp = 0;

                  rawRegistros.forEach(r => {
                    if (Number(r.usuario_id) === uId && r.estado === 'Aprobado') {
                      totalGen += (r.horas_generadas_minutos || 0);
                    }
                  });

                  rawCompensaciones.forEach(c => {
                    if (Number(c.usuario_id) === uId) {
                      totalComp += (c.horas_compensadas_minutos || 0);
                    }
                  });

                  const saldoMinutos = totalGen - totalComp;
                  const esPositivo = saldoMinutos >= 0;

                  return (
                    <div className={`p-2 bg-white rounded-lg font-semibold flex justify-between items-center border ${esPositivo ? 'border-green-300 text-green-900' : 'border-red-300 text-red-900'}`}>
                      <span>Saldo total disponible:</span>
                      <span className="font-bold">{formatTime(saldoMinutos)} hrs</span>
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Fecha</label>
                  <input type="date" required value={compData.fecha} onChange={e => setCompData({...compData, fecha: e.target.value})} className="w-full border rounded-lg p-1.5 outline-none focus:ring-2 focus:ring-green-500 text-xs" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Horas a devolver</label>
                  <input type="text" placeholder="HH:MM" required value={compData.horas} onChange={e => setCompData({...compData, horas: e.target.value})} className="w-full border rounded-lg p-1.5 outline-none focus:ring-2 focus:ring-green-500 text-xs" />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Tipo de Compensación / Motivo</label>
                <select value={compData.motivo} onChange={e => setCompData({...compData, motivo: e.target.value})} className="w-full border rounded-lg p-1.5 outline-none focus:ring-2 focus:ring-green-500 text-xs">
                  <option value="Salida anticipada">Salida anticipada</option>
                  <option value="Permiso personal">Permiso personal</option>
                  <option value="Día administrativo">Día administrativo</option>
                  <option value="Llegada atrasada">Llegada atrasada</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea rows="2" placeholder="Observaciones opcionales..." value={compData.observaciones} onChange={e => setCompData({...compData, observaciones: e.target.value})} className="w-full border rounded-lg p-1.5 outline-none focus:ring-2 focus:ring-green-500 text-xs"></textarea>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t">
                <button type="button" onClick={() => setShowModalComp(false)} className="px-3 py-1.5 border rounded-lg text-gray-600 hover:bg-gray-50 transition font-medium">Cancelar</button>
                <button type="submit" className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition">Aprobar y Descontar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR USUARIO */}
      {showModalUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 text-xs">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl">
            <h2 className="text-base font-bold text-gray-800 mb-3">{editingUserId ? 'Editar Usuario' : 'Registrar Nuevo Usuario'}</h2>
            {userError && <div className="bg-red-50 text-red-600 p-2.5 rounded-lg mb-3 font-medium">{userError}</div>}
            <form onSubmit={handleUserSubmit} className="space-y-3">
              <div><label className="block font-medium text-gray-700 mb-1">Nombre Completo</label><input type="text" required value={userData.nombre} onChange={e => setUserData({...userData, nombre: e.target.value})} className="w-full border rounded-lg p-1.5" /></div>
              <div><label className="block font-medium text-gray-700 mb-1">Correo Electrónico (Login)</label><input type="email" required value={userData.email} onChange={e => setUserData({...userData, email: e.target.value})} className="w-full border rounded-lg p-1.5" /></div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  {editingUserId ? 'Nueva Contraseña (en blanco para mantener)' : 'Contraseña Temporal'}
                </label>
                <input type="password" required={!editingUserId} value={userData.password} onChange={e => setUserData({...userData, password: e.target.value})} className="w-full border rounded-lg p-1.5" />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  {editingUserId ? 'Confirmar Nueva Contraseña' : 'Confirmar Contraseña'}
                </label>
                <input type="password" required={!editingUserId || Boolean(userData.password)} value={userData.confirmPassword} onChange={e => setUserData({...userData, confirmPassword: e.target.value})} className="w-full border rounded-lg p-1.5" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div><label className="block font-medium text-gray-700 mb-1">Cargo</label><input type="text" required value={userData.cargo} onChange={e => setUserData({...userData, cargo: e.target.value})} className="w-full border rounded-lg p-1.5" /></div>
                <div><label className="block font-medium text-gray-700 mb-1">Departamento</label><input type="text" required value={userData.departamento} onChange={e => setUserData({...userData, departamento: e.target.value})} className="w-full border rounded-lg p-1.5" /></div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Rol</label>
                <select value={userData.rol} onChange={e => setUserData({...userData, rol: e.target.value})} className="w-full border rounded-lg p-1.5">
                  <option value="Auditor">Auditor</option>
                  <option value="Analista">Analista</option>
                  <option value="Administrador">Administrador</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button type="button" onClick={() => { setShowModalUser(false); setEditingUserId(null); }} className="px-3 py-1.5 border rounded-lg text-gray-600">Cancelar</button>
                <button type="submit" className="px-3 py-1.5 bg-teal-800 text-white rounded-lg hover:bg-teal-900 font-medium">
                  {editingUserId ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLES DE REGISTRO / AUTORIZAR - RECHAZAR */}
      {registroDetalle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 text-xs">
          <div className="bg-white rounded-2xl p-5 w-full max-w-lg shadow-2xl space-y-3">
            <div className="flex justify-between items-center border-b pb-2.5">
              <h2 className="text-base font-bold text-gray-800">Detalle de la Solicitud</h2>
              {renderBadgeEstado(registroDetalle.estado)}
            </div>

            <div className="space-y-2">
              <p><strong>Fecha:</strong> {registroDetalle.fecha}</p>
              <p><strong>Auditor:</strong> {registroDetalle.auditor}</p>
              <p><strong>Horario Propuesto:</strong> {registroDetalle.hora_inicio && registroDetalle.hora_termino ? `${registroDetalle.hora_inicio} a ${registroDetalle.hora_termino}` : 'Por definir'}</p>
              <p><strong>Motivo:</strong> {registroDetalle.motivo}</p>
              <p><strong>Actividad:</strong> {registroDetalle.actividad}</p>

              {registroDetalle.intervinientes && registroDetalle.intervinientes.length > 0 && (
                <div>
                  <strong>Intervinientes:</strong>
                  <ul className="list-disc pl-4 mt-1">
                    {registroDetalle.intervinientes.map((i, idx) => (
                      <li key={idx}>{i.nombre} ({i.cargo}) - {i.participacion}</li>
                    ))}
                  </ul>
                </div>
              )}

              {registroDetalle.evidencia_url && (
                <div className="pt-2">
                  <a href={`${API_URL}${registroDetalle.evidencia_url}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-medium hover:bg-blue-100">
                    <DownloadCloud size={16} /> Ver Archivo Adjunto (Evidencia)
                  </a>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t">
              <div>
                {isAdmin && registroDetalle.estado === 'Pendiente' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => cambiarEstado(registroDetalle.id, 'Autorizado')}
                      className="px-3 py-1.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
                    >
                      Autorizar Solicitud
                    </button>
                    <button
                      onClick={() => cambiarEstado(registroDetalle.id, 'Rechazado')}
                      className="px-3 py-1.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition"
                    >
                      Rechazar
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => setRegistroDetalle(null)}
                className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    The saved = localStorage.getItem('user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {
        console.error("Error al parsear sesión", e);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={!user ? <LoginScreen onLogin={setUser} /> : <Navigate to="/" replace />} />
        <Route path="/" element={user ? <DashboardApp user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
      </Routes>
    </HashRouter>
  );
}