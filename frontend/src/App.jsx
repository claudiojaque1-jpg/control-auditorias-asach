import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { LayoutDashboard, Clock, FileText, Users, LogOut, Plus, AlertTriangle, Paperclip, Lock, User, UserPlus, Eye, Edit, CheckCircle, Filter, Bell, ChevronRight, Check, Upload, ExternalLink, ChevronLeft, Trash2 } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, BarChart, Bar, CartesianGrid } from 'recharts';

const API_URL = "https://control-auditorias-asach-production.up.railway.app";

const authFetch = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401 || res.status === 403) {
    const data = await res.clone().json().catch(() => ({}));
    if (data.error && (data.error.includes('expirada') || data.error.includes('inválido') || data.error.includes('denegado'))) {
      localStorage.clear();
      window.location.reload();
    }
  }

  return res;
};

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
    setError('');
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
  const themeText = isAdmin ? 'text-teal-800' : 'text-blue-900';

  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({ generadas: 0, compensadas: 0, pendientes: 0, auditores: 0, porAprobar: 0 });

  const [registros, setRegistros] = useState([]);
  const [compensaciones, setCompensaciones] = useState([]);
  const [usuariosDB, setUsuariosDB] = useState([]);

  // Filtros Dashboard
  const [dashFiltroAnio, setDashFiltroAnio] = useState('2026');
  const [dashFiltroMes, setDashFiltroMes] = useState('todos');
  const [dashFiltroUsuario, setDashFiltroUsuario] = useState('todos');

  // Filtros específicos para la sección "Registros" y "Compensaciones"
  const [regFiltroAnio, setRegFiltroAnio] = useState('todos');
  const [regFiltroMes, setRegFiltroMes] = useState('todos');
  const [regFiltroEstado, setRegFiltroEstado] = useState('todos');

  const [compFiltroAnio, setCompFiltroAnio] = useState('todos');
  const [compFiltroMes, setCompFiltroMes] = useState('todos');

  const [rawRegistros, setRawRegistros] = useState([]);
  const [rawCompensaciones, setRawCompensaciones] = useState([]);
  const [rawUsuarios, setRawUsuarios] = useState([]);

  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 20;

  const [showModal, setShowModal] = useState(false);
  const [showModalComp, setShowModalComp] = useState(false);
  const [showModalUser, setShowModalUser] = useState(false);
  const [registroDetalle, setRegistroDetalle] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingEstado, setEditingEstado] = useState('Pendiente');

  const [minutosOriginales, setMinutosOriginales] = useState(0);
  const [horarioOriginal, setHorarioOriginal] = useState({ inicio: '', termino: '' });

  const [intervinientes, setIntervinientes] = useState([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  const [notificacionesLeidas, setNotificacionesLeidas] = useState([]);

  const marcarNotificacionLeida = async (idNotif) => {
    const idStr = String(idNotif);
    setNotificacionesLeidas(prev => (prev.includes(idStr) ? prev : [...prev, idStr]));
    try {
      await authFetch(`${API_URL}/api/notificaciones-leidas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: user.id, notificacion_key: idStr })
      });
    } catch (err) {
      console.error("Error guardando notificación leída:", err);
    }
  };

  const [evidenciasGuardadas, setEvidenciasGuardadas] = useState([]);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);

  const [formData, setFormData] = useState({ fecha: new Date().toISOString().split('T')[0], hora_inicio: '', hora_termino: '', motivo: 'Auditoría', actividad: '', departamento: user.departamento });
  const [compData, setCompData] = useState({ fecha: new Date().toISOString().split('T')[0], horas: '', motivo: 'Salida anticipada', observaciones: '', usuario_id: '' });

  const [editingUserId, setEditingUserId] = useState(null);
  const [userData, setUserData] = useState({ nombre: '', email: '', password: '', confirmPassword: '', departamento: '', rol: 'Auditor' });
  const [userError, setUserError] = useState('');

  const fetchData = async () => {
    try {
      const resNotif = await authFetch(`${API_URL}/api/notificaciones-leidas/${user.id}`);
      if (resNotif.ok) {
        const leidasDB = await resNotif.json();
        setNotificacionesLeidas(leidasDB.map(String));
      }

      if (isAdmin) {
        const resUsers = await authFetch(`${API_URL}/api/usuarios`);
        if (resUsers.ok) setUsuariosDB(await resUsers.json());
      }

      const resEst = await authFetch(`${API_URL}/api/estadisticas/completas`);
      if (resEst.ok) {
        const est = await resEst.json();
        const resRegs = await authFetch(`${API_URL}/api/registros/ultimos`);
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

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => {
      fetchData();
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const aplicarFiltrosDashboard = (todosRegs, todasComps, todosUsers) => {
      let regsFiltradas = todosRegs;
      let compsFiltradas = todasComps;

      const auditoresPuros = todosUsers.filter(u => u.rol !== 'Administrador');

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
          if (r.estado === 'Ejecutado' || r.estado === 'Aprobado') genMin += (r.horas_generadas_minutos || 0);
          if (r.estado === 'Pendiente' || r.estado === 'Aprobado (Pendiente de Ejecución)' || r.estado === 'Revisión por Exceso de Horas') porAprobarMin += (r.horas_generadas_minutos || 0);
      });
      compsFiltradas.forEach(c => {
          compMin += (c.horas_compensadas_minutos || 0);
      });

      setStats({
          generadas: genMin,
          compensadas: compMin,
          pendientes: genMin - compMin,
          porAprobar: porAprobarMin,
          auditores: auditoresPuros.length
      });

      setRegistros(regsFiltradas);
      setCompensaciones(compsFiltradas);
      setPaginaActual(1);
  };

  useEffect(() => {
      if (rawRegistros.length > 0) {
          aplicarFiltrosDashboard(rawRegistros, rawCompensaciones, rawUsuarios);
      }
  }, [dashFiltroAnio, dashFiltroMes, dashFiltroUsuario]);

  const verDetallesRegistro = async (id) => {
    try {
        const res = await authFetch(`${API_URL}/api/registros/${id}`);
        if (res.ok) {
          const data = await res.json();
          setRegistroDetalle(data);
        }
    } catch(err) { alert("⚠️ Error de conexión."); }
  };

  const abrirEdicion = async (r) => {
      setEditingId(r.id);
      setEditingEstado(r.estado);
      setMinutosOriginales(r.horas_generadas_minutos || 0);
      setHorarioOriginal({ inicio: r.hora_inicio || '', termino: r.hora_termino || '' });
      setFormData({ fecha: r.fecha, hora_inicio: r.hora_inicio || '', hora_termino: r.hora_termino || '', motivo: r.motivo, actividad: r.actividad, departamento: r.departamento || user.departamento });
      setEvidenciasGuardadas([]);
      try {
          const res = await authFetch(`${API_URL}/api/registros/${r.id}`);
          if (res.ok) {
              const data = await res.json();
              setIntervinientes(data.intervinientes || []);
              setEvidenciasGuardadas(data.evidencias || []);
          }
      } catch(e) {}
      setShowModal(true);
  };

  const cambiarEstado = async (id, nuevoEstado) => {
      await authFetch(`${API_URL}/api/registros/${id}/estado`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: nuevoEstado })
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

  const handleFileUpload = async (e, registroId) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!registroId) {
      alert("⚠️ Primero debes guardar el registro antes de adjuntar evidencia física.");
      e.target.value = '';
      return;
    }

    const formDataUpload = new FormData();
    formDataUpload.append('archivo', file);
    formDataUpload.append('registro_id', registroId);

    setSubiendoArchivo(true);
    try {
      const res = await authFetch(`${API_URL}/api/evidencias`, {
        method: 'POST',
        body: formDataUpload
      });
      const data = await res.json();
      if (res.ok) {
        if (data.evidencia) {
          setEvidenciasGuardadas(prev => [...prev, data.evidencia]);
        } else {
          const regRes = await authFetch(`${API_URL}/api/registros/${registroId}`);
          if (regRes.ok) {
            const regData = await regRes.json();
            setEvidenciasGuardadas(regData.evidencias || []);
          }
        }
        fetchData();
      } else {
        alert(`⚠️ Error al subir archivo: ${data.error}`);
      }
    } catch (err) {
      alert("⚠️ Error de conexión al subir la evidencia.");
    } finally {
      setSubiendoArchivo(false);
      e.target.value = '';
    }
  };

  const handleDeleteEvidencia = async (evidenciaId) => {
    if (!window.confirm("¿Seguro que deseas eliminar este archivo adjunto?")) return;
    try {
      const res = await authFetch(`${API_URL}/api/evidencias/${evidenciaId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setEvidenciasGuardadas(prev => prev.filter(ev => ev.id !== evidenciaId));
        fetchData();
      } else {
        const data = await res.json();
        alert(`⚠️ Error al eliminar: ${data.error || 'No se pudo borrar el archivo'}`);
      }
    } catch (err) {
      alert("⚠️ Error de conexión al eliminar la evidencia.");
    }
  };

  const handleSubmit = async (e, marcarFinalizado = false) => {
    if (e) e.preventDefault();
    const minutosNuevos = (formData.hora_inicio && formData.hora_termino) ? calcularMinutos() : 0;

    let nuevoEstado = editingEstado;
    const horarioAlterado = (formData.hora_inicio !== horarioOriginal.inicio) || (formData.hora_termino !== horarioOriginal.termino);
    const tiempoCambiado = minutosNuevos !== minutosOriginales;

    if (!isAdmin && (editingEstado === 'Aprobado (Pendiente de Ejecución)' || editingEstado === 'Autorizado')) {
      if (horarioAlterado || tiempoCambiado) {
        nuevoEstado = 'Revisión por Exceso de Horas';
        alert(`⚠️ El horario ha sido modificado (${formData.hora_inicio} - ${formData.hora_termino}). La solicitud se ha enviado a la campanita de notificaciones de la Administradora para su re-autorización.`);
      } else if (marcarFinalizado) {
        nuevoEstado = 'Ejecutado';
      }
    } else if (marcarFinalizado) {
      nuevoEstado = 'Ejecutado';
    }

    const payload = {
      ...formData,
      horas_generadas_minutos: minutosNuevos,
      usuario_id: user.id,
      intervinientes,
      estado: nuevoEstado
    };

    if (editingId) {
        await authFetch(`${API_URL}/api/registros/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } else {
        await authFetch(`${API_URL}/api/registros`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }

    setShowModal(false); setEditingId(null); setIntervinientes([]); setEvidenciasGuardadas([]);
    fetchData();
  };

  const obtenerSaldoAuditorSeleccionado = (uId) => {
    if (!uId) return 0;
    const numId = String(uId);
    let totalEjecutado = 0;
    let totalCompensado = 0;

    rawRegistros.forEach(r => {
      if (String(r.usuario_id) === numId && (r.estado === 'Ejecutado' || r.estado === 'Aprobado')) {
        totalEjecutado += (Number(r.horas_generadas_minutos) || 0);
      }
    });

    rawCompensaciones.forEach(c => {
      if (String(c.usuario_id) === numId) {
        totalCompensado += (Number(c.horas_compensadas_minutos) || 0);
      }
    });

    return totalEjecutado - totalCompensado;
  };

  const handleCompSubmit = async (e) => {
    e.preventDefault();
    if (!compData.usuario_id) return alert("Por favor, seleccione el auditor.");

    let totalMinutos = 0;
    if (compData.horas.includes(':')) {
      const [h, m] = compData.horas.split(':').map(Number);
      totalMinutos = (h * 60) + (m || 0);
    } else {
      totalMinutos = Number(compData.horas) * 60;
    }

    if (isNaN(totalMinutos) || totalMinutos <= 0) {
      return alert("Por favor, ingrese un tiempo válido en formato HH:MM o minutos.");
    }

    const saldoRealMinutos = obtenerSaldoAuditorSeleccionado(compData.usuario_id);

    if (totalMinutos > saldoRealMinutos) {
      return alert(`⚠️ Las horas a descontar superan el saldo pendiente de este auditor (${formatTime(saldoRealMinutos)} hrs disponibles).`);
    }

    const res = await authFetch(`${API_URL}/api/compensaciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...compData, horas_compensadas_minutos: totalMinutos })
    });

    if (res.ok) {
      const auditorSeleccionado = usuariosDB.find(u => String(u.id) === String(compData.usuario_id));
      const nuevoSaldoMinutos = saldoRealMinutos - totalMinutos;

      if (auditorSeleccionado && auditorSeleccionado.email) {
        const asunto = encodeURIComponent(`Registro de Compensación de Horas - ${auditorSeleccionado.nombre}`);
        const cuerpo = encodeURIComponent(
          `Estimado/a ${auditorSeleccionado.nombre},\n\n` +
          `Se ha registrado una compensación (descuento) de horas en el Sistema de Control de Auditorías ASACh con el siguiente detalle:\n\n` +
          `• Fecha: ${compData.fecha}\n` +
          `• Tiempo descontado: ${formatTime(totalMinutos)} hrs (${totalMinutos} minutos)\n` +
          `• Motivo: ${compData.motivo}\n` +
          `• Saldo anterior: ${formatTime(saldoRealMinutos)} hrs\n` +
          `• Nuevo saldo a favor: ${formatTime(nuevoSaldoMinutos)} hrs\n\n` +
          `Saludos cordiales,\n` +
          `${user.nombre}\n` +
          `Administración - Control de Auditorías ASACh`
        );

        window.location.href = `mailto:${auditorSeleccionado.email}?subject=${asunto}&body=${cuerpo}`;
      }
    }

    setShowModalComp(false);
    setCompData({ fecha: new Date().toISOString().split('T')[0], horas: '', motivo: 'Salida anticipada', observaciones: '', usuario_id: '' });
    fetchData();
  };

  const abrirCreacionUsuario = () => {
    setUserError('');
    setEditingUserId(null);
    setUserData({ nombre: '', email: '', password: '', confirmPassword: '', departamento: '', rol: 'Auditor' });
    setShowModalUser(true);
  };

  const abrirEdicionUsuario = (u) => {
    setUserError('');
    setEditingUserId(u.id);
    setUserData({ nombre: u.nombre, email: u.email, password: '', confirmPassword: '', departamento: u.departamento || '', rol: u.rol || 'Auditor' });
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
        const payload = { nombre: userData.nombre, email: userData.email, departamento: userData.departamento, rol: userData.rol };
        if (userData.password) payload.password = userData.password;

        const res = await authFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok) { setUserError(`⚠️ ${data.error || 'Error al guardar usuario'}`); return; }

        setShowModalUser(false);
        fetchData();
    } catch(err) { setUserError('⚠️ Error de conexión.'); }
  };

  const renderBadgeEstado = (estado) => {
      switch(estado) {
          case 'Ejecutado':
              return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">Ejecutado</span>;
          case 'Aprobado (Pendiente de Ejecución)':
          case 'Autorizado':
              return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">Aprobado (Pendiente)</span>;
          case 'Revisión por Exceso de Horas':
              return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">Cambio Horario</span>;
          case 'Rechazado':
              return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">Rechazado</span>;
          default:
              return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-yellow-50 text-yellow-700 border border-yellow-200 whitespace-nowrap">Pendiente</span>;
      }
  };

  const renderBadgeRol = (rol) => {
    switch (rol) {
      case 'Administrador':
        return <span className="bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full font-bold text-[11px]">Administrador</span>;
      case 'Analista':
        return <span className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full font-bold text-[11px]">Analista</span>;
      default:
        return <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-bold text-[11px]">Auditor</span>;
    }
  };

  // Datos para gráficos modernos en Dashboard
  const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const tendenciaData = mesesNombres.map((mes, index) => {
    const numMes = String(index + 1).padStart(2, '0');
    let totalRealizadoMin = 0;
    registros.forEach(r => {
      if (r.fecha && r.fecha.substring(5,7) === numMes && (r.estado === 'Ejecutado')) {
        totalRealizadoMin += (r.horas_generadas_minutos || 0);
      }
    });

    let totalCompensadoMin = 0;
    compensaciones.forEach(c => {
      if (c.fecha && c.fecha.substring(5,7) === numMes) {
        totalCompensadoMin += (c.horas_compensadas_minutos || 0);
      }
    });

    return {
      mes,
      Realizadas: Number((totalRealizadoMin / 60).toFixed(1)),
      Compensadas: Number((totalCompensadoMin / 60).toFixed(1))
    };
  });

  const auditoresSoloAuditores = usuariosDB.filter(u => u.rol !== 'Administrador');

  // Gráfico de saldo acumulado / comparación por auditor
  const auditoresSaldoData = auditoresSoloAuditores.map(u => {
    const uId = String(u.id);
    let minGeneradas = 0;
    let minCompensadas = 0;

    rawRegistros.forEach(r => {
      if (String(r.usuario_id) === uId && (r.estado === 'Ejecutado' || r.estado === 'Aprobado')) {
        minGeneradas += (Number(r.horas_generadas_minutos) || 0);
      }
    });

    rawCompensaciones.forEach(c => {
      if (String(c.usuario_id) === uId) {
        minCompensadas += (Number(c.horas_compensadas_minutos) || 0);
      }
    });

    return {
      nombre: u.nombre ? u.nombre.split(' ')[0] : 'Auditor',
      Generadas: Number((minGeneradas / 60).toFixed(1)),
      Compensadas: Number((minCompensadas / 60).toFixed(1)),
      Saldo: Number(((minGeneradas - minCompensadas) / 60).toFixed(1))
    };
  });

  // Filtrado avanzado para la tabla de Registros
  const registrosFiltradosTabla = rawRegistros.filter(r => {
    if (!isAdmin && String(r.usuario_id) !== String(user.id)) return false;
    if (regFiltroAnio !== 'todos' && (!r.fecha || !r.fecha.startsWith(regFiltroAnio))) return false;
    if (regFiltroMes !== 'todos' && (!r.fecha || r.fecha.substring(5,7) !== regFiltroMes)) return false;
    if (regFiltroEstado !== 'todos' && r.estado !== regFiltroEstado) return false;
    return true;
  });

  // Filtrado avanzado para la tabla de Compensaciones
  const compensacionesFiltradasTabla = rawCompensaciones.filter(c => {
    if (!isAdmin && String(c.usuario_id) !== String(user.id)) return false;
    if (compFiltroAnio !== 'todos' && (!c.fecha || !c.fecha.startsWith(compFiltroAnio))) return false;
    if (compFiltroMes !== 'todos' && (!c.fecha || c.fecha.substring(5,7) !== compFiltroMes)) return false;
    return true;
  });

  const leidasSet = new Set(notificacionesLeidas.map(String));

  const registrosNotif = isAdmin
    ? rawRegistros.filter(r => (r.estado === 'Pendiente' || r.estado === 'Revisión por Exceso de Horas') && !leidasSet.has(String(r.id)))
    : rawRegistros.filter(r => String(r.usuario_id) === String(user.id) && (r.estado.includes('Aprobado') || r.estado.includes('Autorizado') || r.estado === 'Rechazado') && !leidasSet.has(String(r.id)));

  const compensacionesNotif = !isAdmin
    ? rawCompensaciones.filter(c => String(c.usuario_id) === String(user.id) && !leidasSet.has(String(`comp-${c.id}`)))
    : [];

  const totalNotificacionesCount = registrosNotif.length + compensacionesNotif.length;

  const indiceUltimoRegistro = paginaActual * registrosPorPagina;
  const indicePrimerRegistro = indiceUltimoRegistro - registrosPorPagina;
  const registrosActualesPagina = registrosFiltradosTabla.slice(indicePrimerRegistro, indiceUltimoRegistro);
  const totalPaginas = Math.ceil(registrosFiltradosTabla.length / registrosPorPagina);

  const menuClass = (tab) => `flex items-center gap-2.5 p-3 w-full rounded-xl transition text-left text-xs font-semibold ${activeTab === tab ? (isAdmin ? 'bg-teal-900 shadow-md text-white' : 'bg-blue-800 shadow-md text-white') : (isAdmin ? 'hover:bg-teal-900/60 text-teal-100' : 'hover:bg-blue-800/60 text-blue-100')}`;

  const renderContent = () => {
    if (activeTab === 'dashboard') {
      return (
        <div className="space-y-6">
          {stats.pendientes < 0 && <div className="bg-rose-50 border-l-4 border-rose-500 p-3.5 rounded-xl text-xs flex items-center gap-3 shadow-sm"><AlertTriangle className="text-rose-500 shrink-0" size={18} /><p className="text-rose-700 font-medium">Hay <strong>{formatTime(stats.pendientes)} horas de déficit</strong> en el periodo seleccionado.</p></div>}

          {/* TARJETAS DE FILTROS SUPERIORES */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex items-center gap-2 text-gray-800 font-bold text-xs"><Filter size={18} className="text-teal-700"/> <span>Filtros Globales del Dashboard:</span></div>
              <div className="flex flex-wrap gap-2.5 items-center">
                  <select value={dashFiltroAnio} onChange={e => setDashFiltroAnio(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-xs bg-gray-50/50 outline-none font-medium">
                      <option value="todos">📅 Todos los Años</option><option value="2025">2025</option><option value="2026">2026</option><option value="2027">2027</option>
                  </select>
                  <select value={dashFiltroMes} onChange={e => setDashFiltroMes(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-xs bg-gray-50/50 outline-none font-medium">
                      <option value="todos">📆 Todos los Meses</option><option value="01">Enero</option><option value="02">Febrero</option><option value="03">Marzo</option><option value="04">Abril</option><option value="05">Mayo</option><option value="06">Junio</option><option value="07">Julio</option><option value="08">Agosto</option><option value="09">Septiembre</option><option value="10">Octubre</option><option value="11">Noviembre</option><option value="12">Diciembre</option>
                  </select>
                  {isAdmin && (
                      <select value={dashFiltroUsuario} onChange={e => setDashFiltroUsuario(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-xs bg-gray-50/50 outline-none font-medium">
                          <option value="todos">👥 Todos los Auditores</option>
                          {auditoresSoloAuditores.map(u => (<option key={u.id} value={u.id}>{u.nombre}</option>))}
                      </select>
                  )}
              </div>
          </div>

          {/* TARJETAS MÉTRICAS KPI */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-emerald-500 flex flex-col justify-between hover:shadow-md transition"><p className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">Ejecutadas</p><h2 className={`text-2xl font-extrabold mt-2 ${themeText}`}>{formatTime(stats.generadas)}</h2></div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500 flex flex-col justify-between hover:shadow-md transition"><p className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">Compensadas</p><h2 className="text-2xl font-extrabold text-blue-600 mt-2">{formatTime(stats.compensadas)}</h2></div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-indigo-500 flex flex-col justify-between hover:shadow-md transition"><p className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">Saldo (A favor)</p><h2 className="text-2xl font-extrabold text-indigo-600 mt-2">{formatTime(stats.pendientes)}</h2></div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-amber-500 flex flex-col justify-between hover:shadow-md transition"><p className="text-amber-700 text-[11px] font-bold uppercase tracking-wider">En Propuesta</p><h2 className="text-2xl font-extrabold text-amber-500 mt-2">{registros.filter(r => r.estado === 'Pendiente').length}</h2></div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-gray-400 flex flex-col justify-between hover:shadow-md transition"><p className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">{isAdmin ? "Auditores Activos" : "Mis Registros"}</p><h2 className="text-2xl font-extrabold text-gray-700 mt-2">{isAdmin ? stats.auditores : registros.length}</h2></div>
          </div>

          {/* GRÁFICOS MODERNOS ESTILO TARJETA CON CURVAS SUAVES */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800 text-sm">📈 Tendencia Mensual de Horas (en Horas)</h3>
                <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-bold">Real vs Comp.</span>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={tendenciaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="mes" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} formatter={(value) => [`${value} hrs`, '']} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="Realizadas" stroke="#059669" strokeWidth={3} dot={{ r: 4, fill: '#059669' }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="Compensadas" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800 text-sm">📊 {isAdmin ? 'Saldo y Horas por Auditor (en Hrs)' : 'Resumen de Mis Horas'}</h3>
                <span className="text-[11px] bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-bold">Comparativa</span>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={isAdmin ? auditoresSaldoData : [{ nombre: user.nombre.split(' ')[0], Generadas: Number((stats.generadas/60).toFixed(1)), Compensadas: Number((stats.compensadas/60).toFixed(1)), Saldo: Number((stats.pendientes/60).toFixed(1)) }]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="nombre" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} formatter={(value) => [`${value} hrs`, '']} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="Generadas" fill="#10b981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Compensadas" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    {isAdmin && <Bar dataKey="Saldo" fill="#8b5cf6" radius={[6, 6, 0, 0]} />}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'registros') {
        return (
            <div className="space-y-4">
              {/* FILTROS AVANZADOS PARA LA TABLA DE REGISTROS */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">Filtrar Historial de Registros</h3>
                  <p className="text-gray-400 text-[11px]">Busca por año, mes o estado específico</p>
                </div>
                <div className="flex flex-wrap gap-2.5 items-center">
                  <select value={regFiltroAnio} onChange={e => setRegFiltroAnio(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-xs bg-gray-50/50 outline-none font-medium">
                    <option value="todos">📅 Todos los Años</option><option value="2025">2025</option><option value="2026">2026</option><option value="2027">2027</option>
                  </select>
                  <select value={regFiltroMes} onChange={e => setRegFiltroMes(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-xs bg-gray-50/50 outline-none font-medium">
                    <option value="todos">📆 Todos los Meses</option><option value="01">Enero</option><option value="02">Febrero</option><option value="03">Marzo</option><option value="04">Abril</option><option value="05">Mayo</option><option value="06">Junio</option><option value="07">Julio</option><option value="08">Agosto</option><option value="09">Septiembre</option><option value="10">Octubre</option><option value="11">Noviembre</option><option value="12">Diciembre</option>
                  </select>
                  <select value={regFiltroEstado} onChange={e => setRegFiltroEstado(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-xs bg-gray-50/50 outline-none font-medium">
                    <option value="todos">📌 Todos los Estados</option>
                    <option value="Pendiente">Pendiente Autorización</option>
                    <option value="Aprobado (Pendiente de Ejecución)">Aprobado (Pendiente)</option>
                    <option value="Ejecutado">Ejecutado</option>
                    <option value="Revisión por Exceso de Horas">Cambio Horario</option>
                    <option value="Rechazado">Rechazado</option>
                  </select>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-xs">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-800">Historial General de Trabajos</h3>
                  <span className="text-gray-400 text-[11px]">Mostrando {registrosActualesPagina.length} de {registrosFiltradosTabla.length} registros</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white border-b text-gray-400 font-semibold uppercase text-[10px]">
                          <th className="p-3.5 whitespace-nowrap">Fecha / Horario</th>
                          {isAdmin && <th className="p-3.5 whitespace-nowrap">Auditor</th>}
                          <th className="p-3.5">Actividad</th>
                          <th className="p-3.5 whitespace-nowrap">Tiempo</th>
                          <th className="p-3.5 whitespace-nowrap">Estado</th>
                          <th className="p-3.5 text-center whitespace-nowrap">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                      {registrosActualesPagina.length === 0 ? (
                        <tr><td colSpan="6" className="p-6 text-center text-gray-400 font-medium">No hay registros que coincidan con los filtros seleccionados.</td></tr>
                      ) : (
                        registrosActualesPagina.map(r => (
                          <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition">
                              <td className="p-3.5 whitespace-nowrap">
                                <div className="font-bold text-gray-800">{r.fecha}</div>
                                <div className="text-[11px] text-gray-400">{r.hora_inicio && r.hora_termino ? `⏰ ${r.hora_inicio} - ${r.hora_termino}` : 'Sin horario'}</div>
                              </td>
                              {isAdmin && <td className="p-3.5 font-bold text-gray-700 whitespace-nowrap">{r.auditor}</td>}
                              <td className="p-3.5 max-w-xs truncate text-gray-600">{r.actividad} {Number(r.tiene_evidencia) > 0 && <Paperclip size={13} className="inline text-teal-700 ml-1" title="Posee archivo de evidencia" />}</td>
                              <td className="p-3.5 font-extrabold text-gray-800 whitespace-nowrap">{formatTime(r.horas_generadas_minutos)} hrs</td>
                              <td className="p-3.5 whitespace-nowrap">{renderBadgeEstado(r.estado)}</td>
                              <td className="p-3.5 flex justify-center gap-2 items-center whitespace-nowrap">
                                  <button onClick={() => verDetallesRegistro(r.id)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Ver Detalle"><Eye size={16} /></button>

                                  {!isAdmin && (r.estado === 'Aprobado (Pendiente de Ejecución)' || r.estado === 'Autorizado') && String(r.usuario_id) === String(user.id) && (
                                    <button onClick={() => abrirEdicion(r)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-sm transition">
                                      <Check size={14} /> Finalizar
                                    </button>
                                  )}

                                  {(!isAdmin && r.estado === 'Pendiente') && (
                                    <button onClick={() => abrirEdicion(r)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Editar"><Edit size={16} /></button>
                                  )}

                                  {isAdmin && (r.estado === 'Pendiente' || r.estado === 'Revisión por Exceso de Horas') && (
                                    <>
                                      <button onClick={() => cambiarEstado(r.id, 'Aprobado (Pendiente de Ejecución)')} className="text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg text-[11px] font-bold transition">Aprobar</button>
                                      <button onClick={() => cambiarEstado(r.id, 'Rechazado')} className="text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg text-[11px] font-bold transition">Rechazar</button>
                                    </>
                                  )}
                              </td>
                          </tr>
                        ))
                      )}
                      </tbody>
                  </table>
                </div>

                {Math.ceil(registrosFiltradosTabla.length / registrosPorPagina) > 1 && (
                  <div className="p-4 bg-gray-50/50 border-t flex justify-between items-center text-xs">
                    <button
                      disabled={paginaActual === 1}
                      onClick={() => setPaginaActual(p => Math.max(p - 1, 1))}
                      className="px-3.5 py-1.5 bg-white border border-gray-200 rounded-xl disabled:opacity-40 flex items-center gap-1 font-bold shadow-sm"
                    >
                      <ChevronLeft size={14} /> Anterior
                    </button>
                    <span className="text-gray-600 font-bold">Página {paginaActual} de {Math.ceil(registrosFiltradosTabla.length / registrosPorPagina)}</span>
                    <button
                      disabled={paginaActual === Math.ceil(registrosFiltradosTabla.length / registrosPorPagina)}
                      onClick={() => setPaginaActual(p => Math.min(p + 1, Math.ceil(registrosFiltradosTabla.length / registrosPorPagina)))}
                      className="px-3.5 py-1.5 bg-white border border-gray-200 rounded-xl disabled:opacity-40 flex items-center gap-1 font-bold shadow-sm"
                    >
                      Siguiente <ChevronRight size={14} />
                    </button>
                  </div>
                )}
            </div>
          </div>
        );
    }

    if (activeTab === 'compensaciones') {
      return (
        <div className="space-y-4">
          {/* FILTROS AVANZADOS PARA COMPENSACIONES */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-800 text-sm">{isAdmin ? 'Historial de Compensaciones' : 'Mi Historial de Compensaciones'}</h3>
              <p className="text-gray-400 text-[11px]">Filtrar descuentos por año o mes</p>
            </div>
            <div className="flex flex-wrap gap-2.5 items-center">
              <select value={compFiltroAnio} onChange={e => setCompFiltroAnio(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-xs bg-gray-50/50 outline-none font-medium">
                <option value="todos">📅 Todos los Años</option><option value="2025">2025</option><option value="2026">2026</option><option value="2027">2027</option>
              </select>
              <select value={compFiltroMes} onChange={e => setCompFiltroMes(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-xs bg-gray-50/50 outline-none font-medium">
                <option value="todos">📆 Todos los Meses</option><option value="01">Enero</option><option value="02">Febrero</option><option value="03">Marzo</option><option value="04">Abril</option><option value="05">Mayo</option><option value="06">Junio</option><option value="07">Julio</option><option value="08">Agosto</option><option value="09">Septiembre</option><option value="10">Octubre</option><option value="11">Noviembre</option><option value="12">Diciembre</option>
              </select>
              {isAdmin && <button onClick={() => setShowModalComp(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 flex gap-1.5 items-center shadow-sm transition"><Plus size={16} /> Registrar Compensación</button>}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b text-gray-400 font-semibold uppercase text-[10px]">
                    <th className="p-3.5 whitespace-nowrap">Fecha</th>
                    {isAdmin && <th className="p-3.5 whitespace-nowrap">Auditor</th>}
                    <th className="p-3.5">Motivo</th>
                    <th className="p-3.5 whitespace-nowrap">Horas Descontadas</th>
                  </tr>
                </thead>
                <tbody>
                  {compensacionesFiltradasTabla.length === 0 ? (
                    <tr><td colSpan="4" className="p-6 text-center text-gray-400 font-medium">No hay compensaciones registradas para este filtro.</td></tr>
                  ) : (
                    compensacionesFiltradasTabla.map(c => (
                      <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition">
                        <td className="p-3.5 font-bold text-gray-800 whitespace-nowrap">{c.fecha}</td>
                        {isAdmin && <td className="p-3.5 font-bold text-gray-700 whitespace-nowrap">{c.auditor}</td>}
                        <td className="p-3.5 text-gray-600">{c.motivo}</td>
                        <td className="p-3.5 font-extrabold text-rose-600 whitespace-nowrap">-{formatTime(c.horas_compensadas_minutos).replace('-', '')} hrs ({c.horas_compensadas_minutos || 0} min)</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'usuarios' && isAdmin) {
      return (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div><h2 className="text-base font-bold text-gray-800">Administración de Usuarios</h2></div>
            <button onClick={abrirCreacionUsuario} className={`${themeBg} text-white px-4 py-2 rounded-xl text-xs font-bold ${themeHover} flex gap-1.5 items-center shadow-sm transition`}><UserPlus size={16} /> Nuevo Usuario</button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b text-gray-400 font-semibold uppercase text-[10px]">
                    <th className="p-3.5 whitespace-nowrap">Nombre</th>
                    <th className="p-3.5 whitespace-nowrap">Correo</th>
                    <th className="p-3.5 whitespace-nowrap">Rol</th>
                    <th className="p-3.5 text-center whitespace-nowrap">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosDB.map(u => (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition">
                      <td className="p-3.5 font-bold text-gray-800 whitespace-nowrap">{u.nombre}</td>
                      <td className="p-3.5 text-gray-600 whitespace-nowrap">{u.email}</td>
                      <td className="p-3.5 whitespace-nowrap">{renderBadgeRol(u.rol)}</td>
                      <td className="p-3.5 text-center whitespace-nowrap"><button onClick={() => abrirEdicionUsuario(u)} className="text-blue-600 hover:underline font-bold">Editar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 flex">
      <aside className={`w-64 ${themeBg} text-white flex flex-col justify-between hidden md:flex shadow-xl`}>
        <div>
          <div className="p-6 border-b border-teal-700/30 flex items-center gap-3">
            <img src={LOGO_URL} alt="Logo" className="w-10 h-10 object-contain bg-white rounded-xl p-1 shadow" />
            <div><h1 className="font-extrabold text-sm leading-tight tracking-wide">AUDITORÍAS ASACh</h1><span className="text-[10px] text-teal-200/80 font-medium">Panel de Control</span></div>
          </div>
          <nav className="p-4 space-y-2">
            <button onClick={() => setActiveTab('dashboard')} className={menuClass('dashboard')}><LayoutDashboard size={18} /> Dashboard Visual</button>
            <button onClick={() => setActiveTab('registros')} className={menuClass('registros')}><FileText size={18} /> Tablas de Registros</button>
            <button onClick={() => setActiveTab('compensaciones')} className={menuClass('compensaciones')}><Clock size={18} /> Compensaciones</button>
            {isAdmin && <button onClick={() => setActiveTab('usuarios')} className={menuClass('usuarios')}><Users size={18} /> Usuarios</button>}
          </nav>
        </div>
        <div className="p-4 border-t border-teal-700/30 flex items-center justify-between text-xs bg-black/10">
          <div><p className="font-bold text-white">{user.nombre}</p><p className="text-[11px] text-teal-200 font-medium">{user.rol}</p></div>
          <button onClick={onLogout} className="p-2 hover:bg-teal-900/80 rounded-xl text-teal-200 hover:text-white transition flex items-center gap-1" title="Cerrar Sesión"><LogOut size={16} /> Cerrar Sesión</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="bg-white border-b border-gray-100 px-8 py-5 flex justify-between items-center shadow-sm">
          <div>
            <h2 className="text-xl font-extrabold text-gray-800 tracking-tight">Hola, {user.nombre ? user.nombre.split(' ')[0] : 'Usuario'} 👋</h2>
            <p className="text-xs text-gray-400 font-medium">Sistema de Control de Auditorías de remesa ASACh</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)} className="relative p-2.5 text-gray-600 bg-amber-50 hover:bg-amber-100 rounded-2xl transition shadow-sm">
                <Bell size={20} className="text-amber-600" />
                {totalNotificacionesCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center font-extrabold shadow-md animate-pulse">
                    {totalNotificacionesCount}
                  </span>
                )}
              </button>

              {showNotificationsDropdown && (
                <div className="absolute right-0 mt-3 w-96 bg-white rounded-3xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                  <div className="bg-teal-800 text-white p-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Bell size={16} />
                      <span className="font-bold text-xs">{isAdmin ? 'Solicitudes Pendientes' : 'Mis Notificaciones'}</span>
                    </div>
                    {totalNotificacionesCount > 0 && (
                      <span className="bg-amber-400 text-teal-900 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full shadow-sm">
                        {totalNotificacionesCount} nuevas
                      </span>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto p-3 space-y-2.5 bg-gray-50/50">
                    {totalNotificacionesCount === 0 ? (
                      <p className="text-gray-400 text-center py-8 text-xs font-medium">No hay notificaciones pendientes.</p>
                    ) : (
                      isAdmin ? (
                        registrosNotif.map(r => (
                          <div
                            key={r.id}
                            onClick={() => { verDetallesRegistro(r.id); setShowNotificationsDropdown(false); }}
                            className="p-3.5 bg-white hover:bg-teal-50/40 border border-gray-100 rounded-2xl shadow-sm transition cursor-pointer relative group"
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
                                {r.estado === 'Revisión por Exceso de Horas' ? 'Horario Modificado' : (r.motivo || 'Auditoría')}
                              </span>
                              <span className="text-[10px] text-gray-400 font-medium">{r.fecha}</span>
                            </div>
                            <p className="font-bold text-gray-800 text-xs">{r.auditor || 'Auditor'}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">⏰ Tiempo: {formatTime(r.horas_generadas_minutos)} hrs</p>
                            <p className="text-[11px] text-gray-600 truncate mt-1.5 bg-gray-50 p-2 rounded-xl">{r.actividad}</p>
                            <ChevronRight size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 group-hover:text-teal-600 transition" />
                          </div>
                        ))
                      ) : (
                        <>
                          {registrosNotif.map(r => (
                            <div
                              key={r.id}
                              onClick={() => {
                                marcarNotificacionLeida(r.id);
                                verDetallesRegistro(r.id);
                                setShowNotificationsDropdown(false);
                              }}
                              className="p-3.5 bg-white hover:bg-blue-50/40 border border-gray-100 rounded-2xl shadow-sm transition cursor-pointer relative group"
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${r.estado === 'Rechazado' ? 'text-rose-700 bg-rose-50' : 'text-blue-700 bg-blue-50'}`}>
                                  {r.estado === 'Rechazado' ? 'Propuesta Rechazada' : 'Propuesta Aprobada'}
                                </span>
                                <span className="text-[10px] text-gray-400 font-medium">{r.fecha}</span>
                              </div>
                              <p className="font-bold text-gray-800 text-xs truncate">Actividad: {r.actividad}</p>
                              <p className="text-[11px] text-gray-500 mt-0.5">⏰ Tiempo: {formatTime(r.horas_generadas_minutos)} hrs</p>
                              <ChevronRight size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 group-hover:text-blue-600 transition" />
                            </div>
                          ))}

                          {compensacionesNotif.map(c => {
                            const compKey = `comp-${c.id}`;
                            return (
                              <div
                                key={compKey}
                                onClick={() => {
                                  marcarNotificacionLeida(compKey);
                                  setActiveTab('compensaciones');
                                  setShowNotificationsDropdown(false);
                                }}
                                className="p-3.5 bg-white hover:bg-blue-50/40 border border-gray-100 rounded-2xl shadow-sm transition cursor-pointer relative group"
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full">
                                    Nueva Compensación Registrada
                                  </span>
                                  <span className="text-[10px] text-gray-400 font-medium">{c.fecha}</span>
                                </div>
                                <p className="font-bold text-gray-800 text-xs truncate">Motivo: {c.motivo}</p>
                                <p className="text-[11px] text-rose-600 font-extrabold mt-0.5">⏰ Descuento: -{formatTime(c.horas_compensadas_minutos)} hrs</p>
                                <ChevronRight size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 group-hover:text-blue-600 transition" />
                              </div>
                            );
                          })}
                        </>
                      )
                    )}
                  </div>

                  <div className="p-3 bg-white border-t text-center">
                    <button
                      onClick={() => { setActiveTab('dashboard'); setShowNotificationsDropdown(false); }}
                      className="text-xs font-bold text-teal-800 hover:text-teal-900 transition"
                    >
                      Ver todos en el panel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => { setEditingId(null); setFormData({ fecha: new Date().toISOString().split('T')[0], hora_inicio: '', hora_termino: '', motivo: 'Auditoría', actividad: '', departamento: user.departamento }); setEvidenciasGuardadas([]); setShowModal(true); }} className="bg-yellow-400 hover:bg-yellow-500 text-teal-900 px-5 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 shadow-md transition transform active:scale-95">+ NUEVA PROPUESTA</button>
          </div>
        </header>
        <div className="p-8">{renderContent()}</div>
      </main>

      {/* MODAL CREAR / EDITAR REGISTRO CON SUBIDA FÍSICA A GCS */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-7 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto text-xs space-y-4">
            <h3 className="font-extrabold text-base text-gray-800">
              {editingId ? (!isAdmin && (editingEstado === 'Aprobado (Pendiente de Ejecución)' || editingEstado === 'Autorizado') ? 'Ejecutar e Informar Trabajo' : 'Editar Registro') : 'Nueva Propuesta de Horas'}
            </h3>
            <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
              <div><label className="block font-bold mb-1.5 text-gray-700">Fecha</label><input type="date" required value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50/50 outline-none font-medium" /></div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="block font-bold mb-1.5 text-gray-700">Hora Inicio (HH:MM)</label><input type="time" required value={formData.hora_inicio} onChange={e => setFormData({...formData, hora_inicio: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50/50 outline-none font-medium" /></div>
                <div><label className="block font-bold mb-1.5 text-gray-700">Hora Término (HH:MM)</label><input type="time" required value={formData.hora_termino} onChange={e => setFormData({...formData, hora_termino: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50/50 outline-none font-medium" /></div>
              </div>

              {formData.hora_inicio && formData.hora_termino && (
                <div className="bg-blue-50/80 border border-blue-100 text-blue-900 p-3.5 rounded-2xl flex justify-between items-center font-medium">
                  <span>Tiempo total calculado:</span>
                  <span className="font-extrabold text-sm">{formatTime(calcularMinutos())} hrs ({calcularMinutos()} minutos)</span>
                </div>
              )}

              <div>
                <label className="block font-bold mb-1.5 text-gray-700">
                  {!isAdmin && (editingEstado === 'Aprobado (Pendiente de Ejecución)' || editingEstado === 'Autorizado') ? 'Informe Detallado de la Actividad Ejecutada' : 'Actividad Realizada / Propuesta'}
                </label>
                <textarea rows="4" required value={formData.actividad} onChange={e => setFormData({...formData, actividad: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50/50 outline-none font-medium" placeholder="Describa el informe de la auditoría..."></textarea>
              </div>

              {/* SECCIÓN DE SUBIDA Y GESTIÓN DE EVIDENCIAS EN GOOGLE CLOUD STORAGE */}
              <div className="p-4 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 space-y-3 text-left">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-teal-900 flex items-center gap-1.5">
                    <Upload size={14} /> Adjuntar Evidencias (Google Cloud Storage)
                  </label>
                  {subiendoArchivo && <span className="text-[11px] font-extrabold text-blue-600 animate-pulse">Subiendo archivo...</span>}
                </div>

                {editingId ? (
                  <>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt"
                      disabled={subiendoArchivo}
                      onChange={(e) => handleFileUpload(e, editingId)}
                      className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer disabled:opacity-50"
                    />

                    {evidenciasGuardadas.length > 0 ? (
                      <div className="space-y-2 pt-1">
                        <p className="text-[11px] font-extrabold text-emerald-700">📎 Archivos vinculados ({evidenciasGuardadas.length}):</p>
                        {evidenciasGuardadas.map((ev) => (
                          <div key={ev.id} className="bg-white p-2.5 rounded-xl border border-gray-200 flex items-center justify-between shadow-sm">
                            <span className="text-[11px] font-medium text-gray-800 truncate max-w-[230px]" title={ev.nombre_archivo}>
                              {ev.nombre_archivo}
                            </span>
                            <div className="flex items-center gap-2">
                              <a
                                href={ev.archivo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1 font-bold text-[11px]"
                                title="Ver archivo"
                              >
                                Ver <ExternalLink size={12} />
                              </a>
                              <button
                                type="button"
                                onClick={() => handleDeleteEvidencia(ev.id)}
                                className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 transition"
                                title="Eliminar archivo"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400 italic">Aún no hay archivos adjuntos. Puedes subir uno o más archivos antes de finalizar.</p>
                    )}
                  </>
                ) : (
                  <p className="text-[10px] text-gray-400 italic">💡 Nota: Guarda esta nueva propuesta primero para poder adjuntar y gestionar archivos de evidencia en la nube.</p>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 bg-teal-700 text-white rounded-xl font-bold hover:bg-teal-800 shadow-sm">Guardar Cambios</button>
                {!isAdmin && (editingEstado === 'Aprobado (Pendiente de Ejecución)' || editingEstado === 'Autorizado') && (
                  <button type="button" onClick={(e) => handleSubmit(e, true)} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold flex items-center gap-1.5 shadow-sm">
                    <Check size={16} /> Finalizar Trabajo
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {showModalComp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-7 w-full max-w-md shadow-2xl text-xs space-y-4">
            <h3 className="font-extrabold text-base text-gray-800">Registrar Compensación (Descuento de Horas)</h3>
            <form onSubmit={handleCompSubmit} className="space-y-3.5">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Seleccionar Auditor</label>
                <select required value={compData.usuario_id} onChange={e => setCompData({...compData, usuario_id: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50/50 outline-none font-medium">
                  <option value="">-- Seleccione Auditor --</option>
                  {auditoresSoloAuditores.map(u => (<option key={u.id} value={u.id}>{u.nombre}</option>))}
                </select>
              </div>

              {compData.usuario_id && (
                <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${obtenerSaldoAuditorSeleccionado(compData.usuario_id) > 0 ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' : 'bg-amber-50/80 border-amber-200 text-amber-900'}`}>
                  <div className="flex items-center gap-2">
                    <Clock size={16} />
                    <span className="font-bold">Horas pendientes a compensar:</span>
                  </div>
                  <span className="text-sm font-extrabold">{formatTime(obtenerSaldoAuditorSeleccionado(compData.usuario_id))} hrs ({obtenerSaldoAuditorSeleccionado(compData.usuario_id)} min)</span>
                </div>
              )}

              <div><label className="font-bold text-gray-700 block mb-1">Fecha</label><input type="date" required value={compData.fecha} onChange={e => setCompData({...compData, fecha: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50/50 outline-none font-medium" /></div>
              <div><label className="font-bold text-gray-700 block mb-1">Tiempo a Descontar (Ej: 01:30 para 1h 30m)</label><input type="text" placeholder="HH:MM" required value={compData.horas} onChange={e => setCompData({...compData, horas: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50/50 outline-none font-medium" /></div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Motivo</label>
                <select value={compData.motivo} onChange={e => setCompData({...compData, motivo: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50/50 outline-none font-medium">
                  <option value="Salida anticipada">Salida anticipada</option>
                  <option value="Medio día">Medio día</option>
                  <option value="Día libre">Día libre</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setShowModalComp(false)} className="px-4 py-2 border border-gray-200 rounded-xl font-bold text-gray-600">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold shadow-sm">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE CON ENLACE DE GCS */}
      {registroDetalle && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-7 w-full max-w-md shadow-2xl text-xs space-y-3.5 max-h-[90vh] overflow-y-auto">
            <h3 className="font-extrabold text-base text-gray-800">Detalle del Trabajo Propuesto</h3>
            <p><strong>Fecha:</strong> {registroDetalle.fecha}</p>
            <p><strong>Auditor:</strong> {registroDetalle.auditor}</p>
            <p><strong>Horario:</strong> {registroDetalle.hora_inicio && registroDetalle.hora_termino ? `${registroDetalle.hora_inicio} - ${registroDetalle.hora_termino}` : 'Sin horario'}</p>
            <p><strong>Tiempo Total:</strong> {formatTime(registroDetalle.horas_generadas_minutos)} hrs ({registroDetalle.horas_generadas_minutos || 0} min)</p>
            <p><strong>Actividad / Informe:</strong> {registroDetalle.actividad}</p>
            <p><strong>Estado Actual:</strong> {renderBadgeEstado(registroDetalle.estado)}</p>

            <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-700 flex items-center gap-1.5">
                  <Paperclip size={14} className="text-teal-700" /> Evidencia en la Nube (GCS):
                </span>
                <span className={`text-[10px] font-extrabold ${registroDetalle.evidencias && registroDetalle.evidencias.length > 0 ? 'text-emerald-700' : 'text-gray-400'}`}>
                  {registroDetalle.evidencias && registroDetalle.evidencias.length > 0 ? `${registroDetalle.evidencias.length} archivo(s)` : 'Sin adjuntos'}
                </span>
              </div>

              {registroDetalle.evidencias && registroDetalle.evidencias.length > 0 ? (
                registroDetalle.evidencias.map((ev, i) => (
                  <div key={i} className="bg-white p-2.5 rounded-xl border flex items-center justify-between shadow-sm">
                    <span className="text-[11px] font-medium text-teal-900 truncate max-w-[220px]">
                      {ev.nombre_archivo || 'Archivo de evidencia'}
                    </span>
                    <a
                      href={ev.archivo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1 font-bold text-[11px] whitespace-nowrap"
                    >
                      Abrir Archivo <ExternalLink size={12} />
                    </a>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-gray-400 italic">No se ha subido ningún archivo de evidencia a Google Cloud para este registro.</p>
              )}
            </div>

            {isAdmin && (registroDetalle.estado === 'Pendiente' || registroDetalle.estado === 'Revisión por Exceso de Horas') && (
              <div className="flex gap-2 pt-3 border-t border-gray-100 mt-2">
                <button onClick={() => cambiarEstado(registroDetalle.id, 'Aprobado (Pendiente de Ejecución)')} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-bold shadow-sm">
                  {registroDetalle.estado === 'Revisión por Exceso de Horas' ? 'Aprobar Cambio' : 'Aprobar'}
                </button>
                <button onClick={() => cambiarEstado(registroDetalle.id, 'Rechazado')} className="flex-1 bg-rose-600 text-white py-2.5 rounded-xl font-bold shadow-sm">Rechazar</button>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button onClick={() => setRegistroDetalle(null)} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {showModalUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-7 w-full max-w-md shadow-2xl text-xs space-y-4">
            <h3 className="font-extrabold text-base text-gray-800">{editingUserId ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
            {userError && <div className="bg-rose-50 text-rose-600 p-3 rounded-xl font-medium">{userError}</div>}
            <form onSubmit={handleUserSubmit} className="space-y-3.5">
              <div><label className="font-bold text-gray-700 block mb-1">Nombre</label><input type="text" required value={userData.nombre} onChange={e => setUserData({...userData, nombre: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50/50 outline-none font-medium" /></div>
              <div><label className="font-bold text-gray-700 block mb-1">Correo</label><input type="email" required value={userData.email} onChange={e => setUserData({...userData, email: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50/50 outline-none font-medium" /></div>
              <div><label className="font-bold text-gray-700 block mb-1">Contraseña</label><input type="password" value={userData.password} onChange={e => setUserData({...userData, password: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50/50 outline-none font-medium" placeholder="Dejar en blanco para conservar contraseña" /></div>
              <div><label className="font-bold text-gray-700 block mb-1">Confirmar Contraseña</label><input type="password" value={userData.confirmPassword} onChange={e => setUserData({...userData, confirmPassword: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50/50 outline-none font-medium" placeholder="Confirmar contraseña" /></div>
              <div>
                <label className="font-bold text-gray-700 block mb-1">Rol</label>
                <select value={userData.rol} onChange={e => setUserData({...userData, rol: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50/50 outline-none font-medium">
                  <option value="Auditor">Auditor</option>
                  <option value="Analista">Analista</option>
                  <option value="Administrador">Administrador</option>
                </select>
              </div>
              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setShowModalUser(false)} className="px-4 py-2 border border-gray-200 rounded-xl font-bold text-gray-600">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-teal-700 text-white rounded-xl font-extrabold shadow-sm">Guardar</button>
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
    const savedToken = localStorage.getItem('token');
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
    } else {
      localStorage.clear();
    }
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