import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { LayoutDashboard, Clock, FileText, Users, LogOut, Plus, AlertTriangle, Paperclip, Lock, User, UserPlus, Eye, Edit, CheckCircle, Filter, Bell, ChevronRight, Check, Upload, ExternalLink, ChevronLeft, Trash2, Calculator, Search } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

const API_URL = "https://control-auditorias-asach-production.up.railway.app";

// Helper centralizado para enviar automáticamente el Token JWT y detectar sesión caducada
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

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const limpio = String(dateStr).split('T')[0].trim();
  const partes = limpio.split('-');
  if (partes.length === 3 && partes[0].length === 4) {
    const [anio, mes, dia] = partes;
    return `${dia.padStart(2, '0')}-${mes.padStart(2, '0')}-${anio}`;
  }
  const fechaObj = new Date(dateStr);
  if (!isNaN(fechaObj.getTime())) {
    const dia = String(fechaObj.getDate()).padStart(2, '0');
    const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
    const anio = fechaObj.getFullYear();
    return `${dia}-${mes}-${anio}`;
  }
  return String(dateStr);
};

// Anillo circular compacto estilo KPI ejecutivo violeta
function KpiRing({ percent, strokeColor }) {
  const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (safePercent / 100) * circumference;

  return (
    <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
      <svg className="w-11 h-11 -rotate-90" viewBox="0 0 40 40">
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke="#352a5c"
          strokeWidth="3.5"
        />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="3.5"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[9px] font-bold text-violet-100">
        {Math.round(safePercent)}%
      </span>
    </div>
  );
}

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
    <div className="min-h-screen bg-[#17122b] bg-[radial-gradient(ellipse_at_top,#3b1d7a_0%,#17122b_65%)] flex items-center justify-center p-4">
      <div className="bg-[#231c40]/95 border border-violet-400/30 p-8 rounded-2xl shadow-2xl shadow-violet-950/60 w-full max-w-md backdrop-blur-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-violet-900/60 border border-violet-400/35 p-2 flex items-center justify-center relative shadow-inner">
            <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain" />
            <span className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-lg bg-violet-600 border border-violet-300/40 flex items-center justify-center text-white shadow">
              <Calculator size={14} />
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1 leading-tight tracking-wide">CONTROL DE AUDITORÍAS</h1>
          <p className="text-violet-200/85 font-medium text-sm">Remesas ASACh</p>
        </div>
        {error && <div className="bg-rose-950/75 border border-rose-500/40 text-rose-200 p-3 rounded-lg mb-6 text-center text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-violet-100 mb-1">Correo Electrónico</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-violet-300" size={18} />
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-[#16112b] text-white border border-violet-400/35 rounded-lg py-2 pl-10 pr-3 focus:ring-2 focus:ring-violet-400 focus:border-violet-300 outline-none text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-violet-100 mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-violet-300" size={18} />
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-[#16112b] text-white border border-violet-400/35 rounded-lg py-2 pl-10 pr-3 focus:ring-2 focus:ring-violet-400 focus:border-violet-300 outline-none text-sm" />
            </div>
          </div>
          <button type="submit" className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold py-2.5 rounded-lg transition shadow-lg shadow-violet-950/50 mt-4 text-sm">Iniciar Sesión</button>
        </form>
      </div>
    </div>
  );
}

function DashboardApp({ user, onLogout }) {
  const isAdmin = user.rol === 'Administrador';

  const themeBg = isAdmin
    ? 'bg-gradient-to-b from-[#29194d] via-[#20143d] to-[#180f2e]'
    : 'bg-gradient-to-b from-[#251747] via-[#1d1238] to-[#160d2b]';
  const themeHover = isAdmin ? 'hover:bg-violet-800/45' : 'hover:bg-purple-800/45';
  const themeText = isAdmin ? 'text-violet-200' : 'text-purple-200';

  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({ generadas: 0, compensadas: 0, pendientes: 0, auditores: 0, porAprobar: 0 });

  const [registros, setRegistros] = useState([]);
  const [compensaciones, setCompensaciones] = useState([]);
  const [solicitudesCompensacion, setSolicitudesCompensacion] = useState([]);
  const [usuariosDB, setUsuariosDB] = useState([]);

  // Estados de filtros para la sección de Registro de Auditorías (incluye filtro por auditor)
  const [regFiltroAnio, setRegFiltroAnio] = useState('todos');
  const [regFiltroMes, setRegFiltroMes] = useState('todos');
  const [regFiltroEstado, setRegFiltroEstado] = useState('todos');
  const [regFiltroUsuario, setRegFiltroUsuario] = useState('todos');

  // Estados de filtros para la sección de Compensaciones (incluye filtro por auditor)
  const [compFiltroAnio, setCompFiltroAnio] = useState('todos');
  const [compFiltroMes, setCompFiltroMes] = useState('todos');
  const [compFiltroUsuario, setCompFiltroUsuario] = useState('todos');

  const [rawRegistros, setRawRegistros] = useState([]);
  const [rawCompensaciones, setRawCompensaciones] = useState([]);
  const [rawUsuarios, setRawUsuarios] = useState([]);

  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 20;

  const [showModal, setShowModal] = useState(false);
  const [showModalComp, setShowModalComp] = useState(false);
  const [showModalSolicitudComp, setShowModalSolicitudComp] = useState(false);
  const [showModalUser, setShowModalUser] = useState(false);
  const [registroDetalle, setRegistroDetalle] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingEstado, setEditingEstado] = useState('Pendiente');

  const [minutosOriginales, setMinutosOriginales] = useState(0);
  const [horarioOriginal, setHorarioOriginal] = useState({ inicio: '', termino: '' });
  const [fechaOriginal, setFechaOriginal] = useState('');

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
  const [solicitudCompData, setSolicitudCompData] = useState({ fecha: new Date().toISOString().split('T')[0], horas: '', motivo: 'Salida anticipada', observaciones: '' });

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

      const resSolComp = await authFetch(`${API_URL}/api/solicitudes-compensacion`);
      if (resSolComp.ok) {
        setSolicitudesCompensacion(await resSolComp.json());
      }

      const resEst = await authFetch(`${API_URL}/api/estadisticas/completas`);
      if (resEst.ok) {
        const est = await resEst.json();
        const resRegs = await authFetch(`${API_URL}/api/registros/ultimos`);
        const regsConEvidencia = await resRegs.json();

        setRawRegistros(regsConEvidencia || est.registrosCompletos || []);
        setRawCompensaciones(est.compensacionesCompletas || est.compensaciones || []);
        setRawUsuarios(est.usuarios || []);

        calcularEstadisticasGenerales(regsConEvidencia || [], est.compensacionesCompletas || est.compensaciones || [], est.usuarios || []);
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

  const calcularEstadisticasGenerales = (todosRegs, todasComps, todosUsers) => {
      let regsFiltradas = todosRegs;
      let compsFiltradas = todasComps;

      const auditoresPuros = todosUsers.filter(u => u.rol !== 'Administrador');

      if (!isAdmin) {
          regsFiltradas = regsFiltradas.filter(r => String(r.usuario_id) === String(user.id));
          compsFiltradas = compsFiltradas.filter(c => String(c.usuario_id) === String(user.id));
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
          calcularEstadisticasGenerales(rawRegistros, rawCompensaciones, rawUsuarios);
      }
  }, [rawRegistros, rawCompensaciones]);

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
      setFechaOriginal(r.fecha || '');
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

  const eliminarRegistroFallido = async (r) => {
      if (!window.confirm(`¿Seguro que deseas eliminar la auditoría "${r.actividad}" del ${formatDate(r.fecha)}? Esta acción eliminará por completo el registro.`)) {
        return;
      }
      try {
        const res = await authFetch(`${API_URL}/api/registros/${r.id}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          fetchData();
        } else {
          const data = await res.json().catch(() => ({}));
          alert(`⚠️ Error al eliminar: ${data.error || 'No se pudo eliminar el registro.'}`);
        }
      } catch (err) {
        alert("⚠️ Error de conexión al eliminar el registro.");
      }
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
    const fechaAlterada = formData.fecha !== fechaOriginal;

    if (!isAdmin && (editingEstado === 'Aprobado (Pendiente de Ejecución)' || editingEstado === 'Autorizado')) {
      if (fechaAlterada || horarioAlterado || tiempoCambiado) {
        nuevoEstado = 'Revisión por Exceso de Horas';
        alert(`⚠️ El día o el horario ha sido modificado (${formatDate(formData.fecha)} | ${formData.hora_inicio} - ${formData.hora_termino}). La solicitud se ha enviado a la campanita de notificaciones de la Administradora para su re-autorización.`);
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
          `• Fecha: ${formatDate(compData.fecha)}\n` +
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

  const handleSolicitudCompSubmit = async (e) => {
    e.preventDefault();
    let totalMinutos = 0;
    if (solicitudCompData.horas.includes(':')) {
      const [h, m] = solicitudCompData.horas.split(':').map(Number);
      totalMinutos = (h * 60) + (m || 0);
    } else {
      totalMinutos = Number(solicitudCompData.horas) * 60;
    }

    if (isNaN(totalMinutos) || totalMinutos <= 0) {
      return alert("Por favor, ingrese un tiempo válido en formato HH:MM.");
    }

    const saldoDisponible = obtenerSaldoAuditorSeleccionado(user.id);
    if (totalMinutos > saldoDisponible) {
      return alert(`⚠️ Las horas solicitadas superan tu saldo disponible (${formatTime(saldoDisponible)} hrs).`);
    }

    try {
      const res = await authFetch(`${API_URL}/api/solicitudes-compensacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: solicitudCompData.fecha,
          horas_solicitadas_minutos: totalMinutos,
          motivo: solicitudCompData.motivo,
          observaciones: solicitudCompData.observaciones
        })
      });

      if (res.ok) {
        alert("✅ Solicitud de compensación enviada al Administrador.");
        setShowModalSolicitudComp(false);
        setSolicitudCompData({ fecha: new Date().toISOString().split('T')[0], horas: '', motivo: 'Salida anticipada', observaciones: '' });
        fetchData();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(`⚠️ ${data.error || 'No se pudo enviar la solicitud.'}`);
      }
    } catch (err) {
      alert("⚠️ Error de conexión al enviar la solicitud.");
    }
  };

  const aprobarSolicitudCompensacion = async (sol) => {
    const saldoActual = obtenerSaldoAuditorSeleccionado(sol.usuario_id);
    if (sol.horas_solicitadas_minutos > saldoActual) {
      return alert(`⚠️ El auditor solo tiene ${formatTime(saldoActual)} hrs disponibles para compensar.`);
    }
    try {
      const res = await authFetch(`${API_URL}/api/solicitudes-compensacion/${sol.id}/aprobar`, {
        method: 'PUT'
      });
      if (res.ok) {
        marcarNotificacionLeida(`solcomp-${sol.id}`);

        const auditorObj = usuariosDB.find(u => String(u.id) === String(sol.usuario_id)) || rawUsuarios.find(u => String(u.id) === String(sol.usuario_id));
        const correoAuditor = sol.auditor_email || (auditorObj && auditorObj.email) || '';
        const nombreAuditor = sol.auditor || (auditorObj && auditorObj.nombre) || 'Auditor';
        const nuevoSaldoMinutos = saldoActual - Number(sol.horas_solicitadas_minutos || 0);

        if (correoAuditor) {
          const asunto = encodeURIComponent(`Compensación Aprobada y Asignada - ${nombreAuditor}`);
          const cuerpo = encodeURIComponent(
            `Estimado/a ${nombreAuditor},\n\n` +
            `Se ha aprobado y asignado tu solicitud de compensación de horas en el Sistema de Control de Auditorías ASACh con el siguiente detalle:\n\n` +
            `• Fecha: ${formatDate(sol.fecha)}\n` +
            `• Tiempo compensado: ${formatTime(sol.horas_solicitadas_minutos)} hrs (${sol.horas_solicitadas_minutos} minutos)\n` +
            `• Motivo: ${sol.motivo}\n` +
            (sol.observaciones ? `• Observaciones: ${sol.observaciones}\n` : '') +
            `• Saldo anterior: ${formatTime(saldoActual)} hrs\n` +
            `• Nuevo saldo a favor: ${formatTime(nuevoSaldoMinutos)} hrs\n\n` +
            `Saludos cordiales,\n` +
            `${user.nombre}\n` +
            `Administración - Control de Auditorías ASACh`
          );

          window.location.href = `mailto:${correoAuditor}?subject=${asunto}&body=${cuerpo}`;
        }

        fetchData();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(`⚠️ ${data.error || 'No se pudo aprobar la solicitud.'}`);
      }
    } catch (err) {
      alert("⚠️ Error de conexión al aprobar la solicitud.");
    }
  };

  const rechazarSolicitudCompensacion = async (sol) => {
    try {
      const res = await authFetch(`${API_URL}/api/solicitudes-compensacion/${sol.id}/rechazar`, {
        method: 'PUT'
      });
      if (res.ok) {
        marcarNotificacionLeida(`solcomp-${sol.id}`);
        fetchData();
      }
    } catch (err) {
      alert("⚠️ Error de conexión al rechazar la solicitud.");
    }
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
              return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-900/60 text-emerald-200 border border-emerald-400/35 whitespace-nowrap">Ejecutado</span>;
          case 'Aprobado (Pendiente de Ejecución)':
          case 'Autorizado':
              return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-violet-900/65 text-violet-200 border border-violet-400/35 whitespace-nowrap">Aprobado (Pendiente de Ejecución)</span>;
          case 'Revisión por Exceso de Horas':
              return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-900/65 text-amber-200 border border-amber-400/35 whitespace-nowrap">Revisión por Cambio de Horario</span>;
          case 'Rechazado':
              return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-900/65 text-rose-200 border border-rose-400/35 whitespace-nowrap">Rechazado</span>;
          default:
              return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-fuchsia-900/65 text-fuchsia-200 border border-fuchsia-400/35 whitespace-nowrap">Pendiente Autorización</span>;
      }
  };

  const renderBadgeRol = (rol) => {
    switch (rol) {
      case 'Administrador':
        return <span className="bg-fuchsia-900/70 text-fuchsia-200 border border-fuchsia-400/35 px-2.5 py-1 rounded-full font-bold text-[11px]">Administrador</span>;
      case 'Analista':
        return <span className="bg-violet-900/70 text-violet-200 border border-violet-400/35 px-2.5 py-1 rounded-full font-bold text-[11px]">Analista</span>;
      default:
        return <span className="bg-purple-900/70 text-purple-200 border border-purple-400/35 px-2.5 py-1 rounded-full font-bold text-[11px]">Auditor</span>;
    }
  };

  const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  let saldoAcumuladoMin = 0;
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

    saldoAcumuladoMin += (totalRealizadoMin - totalCompensadoMin);

    return {
      mes,
      Realizadas: Number((totalRealizadoMin / 60).toFixed(1)),
      Compensadas: Number((totalCompensadoMin / 60).toFixed(1)),
      SaldoAcumulado: Number((saldoAcumuladoMin / 60).toFixed(1))
    };
  });

  // Datos por motivo de compensación para gráfico adicional
  const motivosMap = {};
  compensaciones.forEach(c => {
    const mot = c.motivo || 'Otro';
    motivosMap[mot] = (motivosMap[mot] || 0) + (Number(c.horas_compensadas_minutos) || 0);
  });
  const motivosCompData = Object.entries(motivosMap).map(([motivo, mins]) => ({
    motivo,
    Horas: Number((mins / 60).toFixed(1))
  }));

  const cantEjecutadas = registros.filter(r => r.estado === 'Ejecutado').length;
  const cantPendientes = registros.filter(r => r.estado === 'Pendiente' || r.estado === 'Revisión por Exceso de Horas').length;
  const cantAprobadasPendientes = registros.filter(r => r.estado === 'Aprobado (Pendiente de Ejecución)' || r.estado === 'Autorizado').length;
  const cantRechazadas = registros.filter(r => r.estado === 'Rechazado').length;

  const estadoData = [
    { name: 'Ejecutadas', value: cantEjecutadas, color: '#a855f7' },
    { name: 'Pendientes / Modif.', value: cantPendientes, color: '#f59e0b' },
    { name: 'Aprob. Pend. Ejec.', value: cantAprobadasPendientes, color: '#38bdf8' },
    ...(cantRechazadas > 0 ? [{ name: 'Rechazadas', value: cantRechazadas, color: '#f43f5e' }] : [])
  ].filter(d => d.value > 0);

  const totalEstadosCount = estadoData.reduce((acc, item) => acc + item.value, 0);

  const auditoresSoloAuditores = usuariosDB.filter(u => u.rol !== 'Administrador');
  const auditoresDataDoble = auditoresSoloAuditores.map(u => {
    const uId = String(u.id);
    let minAprobadas = 0;
    let minCompensadas = 0;

    rawRegistros.forEach(r => {
      if (String(r.usuario_id) === uId && (r.estado === 'Ejecutado' || r.estado === 'Aprobado')) {
        minAprobadas += (Number(r.horas_generadas_minutos) || 0);
      }
    });

    rawCompensaciones.forEach(c => {
      if (String(c.usuario_id) === uId) {
        minCompensadas += (Number(c.horas_compensadas_minutos) || 0);
      }
    });

    return {
      nombre: u.nombre ? u.nombre.split(' ')[0] : 'Auditor',
      Aprobadas: Number((minAprobadas / 60).toFixed(1)),
      Compensadas: Number((minCompensadas / 60).toFixed(1))
    };
  });

  // Filtrado avanzado para la tabla de Registro de Auditorías (incluyendo filtro por auditor si es admin)
  const registrosFiltradosTabla = rawRegistros.filter(r => {
    if (!isAdmin && String(r.usuario_id) !== String(user.id)) return false;
    if (isAdmin && regFiltroUsuario !== 'todos' && String(r.usuario_id) !== String(regFiltroUsuario)) return false;
    if (regFiltroAnio !== 'todos' && (!r.fecha || !r.fecha.startsWith(regFiltroAnio))) return false;
    if (regFiltroMes !== 'todos' && (!r.fecha || r.fecha.substring(5,7) !== regFiltroMes)) return false;
    if (regFiltroEstado !== 'todos' && r.estado !== regFiltroEstado) return false;
    return true;
  });

  // Unificación de solicitudes y compensaciones en una sola fila por registro
  const filasCompensacionesUnificadas = (() => {
    const compsVisibles = rawCompensaciones.filter(c => isAdmin || String(c.usuario_id) === String(user.id));
    const solsVisibles = solicitudesCompensacion.filter(s => isAdmin || String(s.usuario_id) === String(user.id));
    const usadasCompIds = new Set();

    const filasDesdeSolicitudes = solsVisibles.map(s => {
      const minutosSol = Number(s.horas_solicitadas_minutos || 0);
      const fechaSolStr = String(s.fecha || '').split('T')[0];
      const fechaRespRaw = s.fecha_respuesta || s.fecha_asignacion || s.updated_at || '';
      const fechaRespStr = String(fechaRespRaw).split('T')[0];

      let compEmparejada = null;
      if (s.estado === 'Aprobada') {
        compEmparejada = compsVisibles.find(c => {
          if (usadasCompIds.has(c.id)) return false;
          const mismaUsuario = String(c.usuario_id) === String(s.usuario_id);
          const mismosMinutos = Number(c.horas_compensadas_minutos || 0) === minutosSol;
          const mismaFecha = String(c.fecha || '').split('T')[0] === fechaSolStr || String(c.fecha || '').split('T')[0] === fechaRespStr;
          return mismaUsuario && mismosMinutos && mismaFecha;
        }) || compsVisibles.find(c => {
          if (usadasCompIds.has(c.id)) return false;
          return String(c.usuario_id) === String(s.usuario_id) && Number(c.horas_compensadas_minutos || 0) === minutosSol;
        });

        if (compEmparejada) {
          usadasCompIds.add(compEmparejada.id);
        }
      }

      const fechaAsignacion = compEmparejada
        ? compEmparejada.fecha
        : (s.estado === 'Pendiente' ? '' : (fechaRespRaw || s.fecha));

      return {
        key: `sol-${s.id}`,
        solicitudOriginal: s,
        usuario_id: s.usuario_id,
        auditor: s.auditor || 'Auditor',
        fechaSolicitud: s.fecha,
        fechaAsignacion,
        fechaFiltro: fechaAsignacion || s.fecha,
        motivo: s.motivo,
        observaciones: s.observaciones,
        estado: s.estado,
        minutos: minutosSol,
        descontada: s.estado === 'Aprobada' || Boolean(compEmparejada)
      };
    });

    const filasDesdeCompsDirectas = compsVisibles
      .filter(c => !usadasCompIds.has(c.id))
      .map(c => ({
        key: `comp-${c.id}`,
        solicitudOriginal: null,
        usuario_id: c.usuario_id,
        auditor: c.auditor || 'Auditor',
        fechaSolicitud: '',
        fechaAsignacion: c.fecha,
        fechaFiltro: c.fecha,
        motivo: c.motivo,
        observaciones: c.observaciones,
        estado: 'Asignada',
        minutos: Number(c.horas_compensadas_minutos || 0),
        descontada: true
      }));

    return [...filasDesdeSolicitudes, ...filasDesdeCompsDirectas].filter(item => {
      if (isAdmin && compFiltroUsuario !== 'todos' && String(item.usuario_id) !== String(compFiltroUsuario)) return false;
      if (compFiltroAnio !== 'todos' && (!item.fechaFiltro || !item.fechaFiltro.startsWith(compFiltroAnio))) return false;
      if (compFiltroMes !== 'todos' && (!item.fechaFiltro || item.fechaFiltro.substring(5,7) !== compFiltroMes)) return false;
      return true;
    });
  })();

  const leidasSet = new Set(notificacionesLeidas.map(String));

  const registrosNotif = isAdmin
    ? rawRegistros.filter(r => (r.estado === 'Pendiente' || r.estado === 'Revisión por Exceso de Horas') && !leidasSet.has(String(r.id)))
    : rawRegistros.filter(r => String(r.usuario_id) === String(user.id) && (r.estado.includes('Aprobado') || r.estado.includes('Autorizado') || r.estado === 'Rechazado') && !leidasSet.has(String(r.id)));

  const solicitudesCompNotifAdmin = isAdmin
    ? solicitudesCompensacion.filter(s => s.estado === 'Pendiente' && !leidasSet.has(`solcomp-${s.id}`))
    : [];

  const compensacionesNotif = !isAdmin
    ? rawCompensaciones.filter(c => String(c.usuario_id) === String(user.id) && !leidasSet.has(String(`comp-${c.id}`)))
    : [];

  const totalNotificacionesCount = registrosNotif.length + solicitudesCompNotifAdmin.length + compensacionesNotif.length;

  const indiceUltimoRegistro = paginaActual * registrosPorPagina;
  const indicePrimerRegistro = indiceUltimoRegistro - registrosPorPagina;
  const registrosActualesPagina = registrosFiltradosTabla.slice(indicePrimerRegistro, indiceUltimoRegistro);
  const totalPaginas = Math.ceil(registrosFiltradosTabla.length / registrosPorPagina);

  const menuClass = (tab) => `flex items-center gap-2.5 p-2.5 w-full rounded-lg transition text-left text-xs ${
    activeTab === tab
      ? 'bg-violet-600/45 text-white font-bold border border-violet-300/35 shadow-sm'
      : 'text-violet-100/80 hover:bg-violet-800/40 hover:text-white'
  }`;

  const renderContent = () => {
    if (activeTab === 'dashboard') {
      const pctCompensado = stats.generadas > 0 ? (stats.compensadas / stats.generadas) * 100 : (stats.compensadas > 0 ? 100 : 0);
      const pctSaldo = stats.generadas > 0 ? Math.max(0, (stats.pendientes / stats.generadas) * 100) : 0;
      const pctEjecutadas = registros.length > 0 ? (cantEjecutadas / registros.length) * 100 : 0;
      const pctPropuestas = registros.length > 0 ? (cantPendientes / registros.length) * 100 : 0;
      const pctAuditores = usuariosDB.length > 0 ? (stats.auditores / usuariosDB.length) * 100 : (stats.auditores > 0 ? 100 : 0);

      return (
        <div className="bg-[#1e1738] text-violet-50 p-4 md:p-5 rounded-2xl border border-violet-400/25 shadow-xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-violet-400/20 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-violet-800/60 border border-violet-400/35 flex items-center justify-center text-violet-200">
                <Calculator size={16} />
              </span>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-300">Audit Telemetry</span>
                <h3 className="text-sm font-bold text-white">Resumen Operativo y Balance de Horas</h3>
              </div>
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#2a214d] border border-violet-400/30 text-violet-100 font-medium">
              Periodo 2026 · {isAdmin ? 'Vista Global' : 'Mi Cuenta'}
            </span>
          </div>

          {stats.pendientes < 0 && (
            <div className="bg-rose-950/70 border border-rose-500/40 p-3 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="text-rose-300 shrink-0" size={16} />
              <p className="text-rose-100 font-medium">
                Hay <strong className="text-white">{formatTime(stats.pendientes)} horas de déficit</strong> en el periodo seleccionado.
              </p>
            </div>
          )}

          {/* TARJETAS KPI EJECUTIVAS CON ANILLO CIRCULAR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            <div className="bg-[#271f47] p-3.5 rounded-xl border border-violet-400/25 hover:border-purple-300/50 transition flex items-center justify-between gap-2">
              <div>
                <p className="text-violet-200/80 text-[10px] font-bold uppercase tracking-wider">Ejecutadas</p>
                <h2 className="text-xl font-extrabold text-purple-200 mt-1">{formatTime(stats.generadas)}</h2>
                <span className="text-[10px] text-violet-200/65">Horas aprobadas</span>
              </div>
              <KpiRing percent={pctEjecutadas} strokeColor="#c084fc" />
            </div>

            <div className="bg-[#271f47] p-3.5 rounded-xl border border-violet-400/25 hover:border-fuchsia-300/50 transition flex items-center justify-between gap-2">
              <div>
                <p className="text-violet-200/80 text-[10px] font-bold uppercase tracking-wider">Compensadas</p>
                <h2 className="text-xl font-extrabold text-fuchsia-300 mt-1">{formatTime(stats.compensadas)}</h2>
                <span className="text-[10px] text-violet-200/65">Horas descontadas</span>
              </div>
              <KpiRing percent={pctCompensado} strokeColor="#e879f9" />
            </div>

            <div className="bg-[#271f47] p-3.5 rounded-xl border border-violet-400/25 hover:border-violet-300/50 transition flex items-center justify-between gap-2">
              <div>
                <p className="text-violet-200/80 text-[10px] font-bold uppercase tracking-wider">Saldo (A favor)</p>
                <h2 className="text-xl font-extrabold text-violet-200 mt-1">{formatTime(stats.pendientes)}</h2>
                <span className="text-[10px] text-violet-200/65">Disponible</span>
              </div>
              <KpiRing percent={pctSaldo} strokeColor="#a78bfa" />
            </div>

            <div className="bg-[#271f47] p-3.5 rounded-xl border border-violet-400/25 hover:border-amber-300/50 transition flex items-center justify-between gap-2">
              <div>
                <p className="text-amber-200 text-[10px] font-bold uppercase tracking-wider">En Propuesta</p>
                <h2 className="text-xl font-extrabold text-amber-300 mt-1">{registros.filter(r => r.estado === 'Pendiente').length}</h2>
                <span className="text-[10px] text-violet-200/65">Por autorizar</span>
              </div>
              <KpiRing percent={pctPropuestas} strokeColor="#fbbf24" />
            </div>

            <div className="bg-[#271f47] p-3.5 rounded-xl border border-violet-400/25 hover:border-indigo-300/50 transition flex items-center justify-between gap-2">
              <div>
                <p className="text-violet-200/80 text-[10px] font-bold uppercase tracking-wider">{isAdmin ? "Auditores Activos" : "Mis Registros"}</p>
                <h2 className="text-xl font-extrabold text-white mt-1">{isAdmin ? stats.auditores : registros.length}</h2>
                <span className="text-[10px] text-violet-200/65">{isAdmin ? "Equipo activo" : "Total histórico"}</span>
              </div>
              <KpiRing percent={pctAuditores} strokeColor="#818cf8" />
            </div>
          </div>

          {/* TRAYECTORIA MENSUAL CON GRADIENTE + DONA CON DATO CENTRAL */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-[#271f47] p-4 rounded-xl border border-violet-400/25 lg:col-span-2 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider">Trayectoria Mensual de Horas (en Hrs)</h3>
                <span className="text-[10px] text-violet-200/75">Realizadas vs. Compensadas</span>
              </div>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={tendenciaData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradRealizadas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c084fc" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#c084fc" stopOpacity={0.04} />
                      </linearGradient>
                      <linearGradient id="gradCompensadas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f472b6" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#f472b6" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="mes" stroke="#b8a9e3" fontSize={11} tickLine={false} axisLine={{ stroke: '#3c3069' }} />
                    <YAxis stroke="#b8a9e3" fontSize={11} tickLine={false} axisLine={false} />
                    <RechartsTooltip
                      formatter={(value) => [`${value} hrs`, '']}
                      contentStyle={{ backgroundColor: '#1c1536', borderColor: '#7c3aed', borderRadius: '10px', color: '#f5f3ff', fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', color: '#ede9fe' }} />
                    <Area type="monotone" dataKey="Realizadas" stroke="#c084fc" strokeWidth={2.5} fill="url(#gradRealizadas)" activeDot={{ r: 5 }} />
                    <Area type="monotone" dataKey="Compensadas" stroke="#f472b6" strokeWidth={2.5} fill="url(#gradCompensadas)" activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-[#271f47] p-4 rounded-xl border border-violet-400/25 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider">Distribución por Estado</h3>
                <span className="text-[10px] text-violet-200/75">{totalEstadosCount} total</span>
              </div>

              {estadoData.length === 0 ? (
                <div className="h-60 flex items-center justify-center">
                  <p className="text-violet-300/60 text-xs">Sin datos registrados</p>
                </div>
              ) : (
                <div className="flex flex-col justify-between h-60">
                  <div className="relative h-36 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={estadoData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={38}
                          outerRadius={56}
                          paddingAngle={3}
                          stroke="none"
                        >
                          {estadoData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#1c1536', borderColor: '#7c3aed', borderRadius: '10px', color: '#f5f3ff', fontSize: '11px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-base font-extrabold text-white leading-none">{totalEstadosCount}</span>
                      <span className="text-[9px] text-violet-200/75 uppercase mt-0.5">Registros</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-violet-400/20 text-[11px]">
                    {estadoData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-violet-100">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="truncate">{item.name}</span>
                        </div>
                        <span className="font-bold text-white">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* FILA DE GRÁFICOS ADICIONALES: SALDO ACUMULADO + MOTIVOS DE COMPENSACIÓN */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-[#271f47] p-4 rounded-xl border border-violet-400/25 lg:col-span-2 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider">Evolución de Saldo Neto Acumulado (en Hrs)</h3>
                <span className="text-[10px] text-violet-200/75">Acumulado mensual a favor</span>
              </div>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={tendenciaData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                    <XAxis dataKey="mes" stroke="#b8a9e3" fontSize={11} tickLine={false} axisLine={{ stroke: '#3c3069' }} />
                    <YAxis stroke="#b8a9e3" fontSize={11} tickLine={false} axisLine={false} />
                    <RechartsTooltip
                      formatter={(value) => [`${value} hrs`, 'Saldo Acumulado']}
                      contentStyle={{ backgroundColor: '#1c1536', borderColor: '#7c3aed', borderRadius: '10px', color: '#f5f3ff', fontSize: '11px' }}
                    />
                    <Line type="monotone" dataKey="SaldoAcumulado" name="Saldo Acumulado" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 3.5, fill: '#38bdf8' }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-[#271f47] p-4 rounded-xl border border-violet-400/25 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider">Compensaciones por Motivo</h3>
                <span className="text-[10px] text-violet-200/75">Horas usadas</span>
              </div>
              {motivosCompData.length === 0 ? (
                <div className="h-52 flex items-center justify-center">
                  <p className="text-violet-300/60 text-xs">Sin compensaciones aún</p>
                </div>
              ) : (
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={motivosCompData} layout="vertical" margin={{ top: 4, right: 16, left: 10, bottom: 4 }}>
                      <XAxis type="number" stroke="#b8a9e3" fontSize={10} tickLine={false} axisLine={{ stroke: '#3c3069' }} />
                      <YAxis type="category" dataKey="motivo" stroke="#ede9fe" fontSize={10} width={95} tickLine={false} axisLine={false} />
                      <RechartsTooltip
                        formatter={(value) => [`${value} hrs`, 'Horas']}
                        contentStyle={{ backgroundColor: '#1c1536', borderColor: '#7c3aed', borderRadius: '10px', color: '#f5f3ff', fontSize: '11px' }}
                      />
                      <Bar dataKey="Horas" fill="#e879f9" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {isAdmin && (
            <div className="bg-[#271f47] p-4 rounded-xl border border-violet-400/25">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider">Comparativa por Auditor: Horas Aprobadas vs Compensadas (en Hrs)</h3>
                <span className="text-[10px] text-violet-200/75">Balance acumulado</span>
              </div>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={auditoresDataDoble} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                    <XAxis dataKey="nombre" stroke="#b8a9e3" fontSize={11} tickLine={false} axisLine={{ stroke: '#3c3069' }} />
                    <YAxis stroke="#b8a9e3" fontSize={11} tickLine={false} axisLine={false} />
                    <RechartsTooltip
                      formatter={(value) => [`${value} hrs`, '']}
                      contentStyle={{ backgroundColor: '#1c1536', borderColor: '#7c3aed', borderRadius: '10px', color: '#f5f3ff', fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', color: '#ede9fe' }} />
                    <Bar dataKey="Aprobadas" fill="#a855f7" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Compensadas" fill="#ec4899" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'registros') {
        return (
            <div className="space-y-4">
              {/* FILTROS EN LA PÁGINA DE REGISTRO DE AUDITORÍAS */}
              <div className="bg-[#231c40] p-4 rounded-xl shadow-lg border border-violet-400/25 flex flex-wrap gap-3 items-center justify-between text-xs text-violet-50">
                <div className="flex items-center gap-2 text-violet-100 font-bold"><Filter size={16} className="text-fuchsia-300"/> <span>Filtros de Registro de Auditorías:</span></div>
                <div className="flex flex-wrap gap-2 items-center">
                  {isAdmin && (
                    <select value={regFiltroUsuario} onChange={e => setRegFiltroUsuario(e.target.value)} className="border border-violet-400/35 rounded-lg p-2 text-xs bg-[#181230] text-violet-50 outline-none focus:border-violet-300">
                      <option value="todos">👥 Todos los Auditores</option>
                      {auditoresSoloAuditores.map(u => (<option key={u.id} value={u.id}>{u.nombre}</option>))}
                    </select>
                  )}
                  <select value={regFiltroAnio} onChange={e => setRegFiltroAnio(e.target.value)} className="border border-violet-400/35 rounded-lg p-2 text-xs bg-[#181230] text-violet-50 outline-none focus:border-violet-300">
                    <option value="todos">📅 Todos los Años</option><option value="2025">2025</option><option value="2026">2026</option><option value="2027">2027</option>
                  </select>
                  <select value={regFiltroMes} onChange={e => setRegFiltroMes(e.target.value)} className="border border-violet-400/35 rounded-lg p-2 text-xs bg-[#181230] text-violet-50 outline-none focus:border-violet-300">
                    <option value="todos">📆 Todos los Meses</option><option value="01">Enero</option><option value="02">Febrero</option><option value="03">Marzo</option><option value="04">Abril</option><option value="05">Mayo</option><option value="06">Junio</option><option value="07">Julio</option><option value="08">Agosto</option><option value="09">Septiembre</option><option value="10">Octubre</option><option value="11">Noviembre</option><option value="12">Diciembre</option>
                  </select>
                  <select value={regFiltroEstado} onChange={e => setRegFiltroEstado(e.target.value)} className="border border-violet-400/35 rounded-lg p-2 text-xs bg-[#181230] text-violet-50 outline-none focus:border-violet-300">
                    <option value="todos">📌 Todos los Estados</option>
                    <option value="Pendiente">Pendiente Autorización</option>
                    <option value="Aprobado (Pendiente de Ejecución)">Aprobado (Pendiente)</option>
                    <option value="Ejecutado">Ejecutado</option>
                    <option value="Revisión por Exceso de Horas">Cambio Horario</option>
                    <option value="Rechazado">Rechazado</option>
                  </select>
                </div>
              </div>

              <div className="bg-[#231c40] rounded-xl shadow-lg border border-violet-400/25 overflow-hidden text-xs text-violet-50">
                  <div className="p-3.5 border-b border-violet-400/20 bg-[#2a214d] flex justify-between items-center">
                    <h3 className="font-bold text-white flex items-center gap-2"><Search size={14} className="text-violet-300" /> Registro de Auditorías</h3>
                    <span className="text-violet-200/80 text-[11px]">Mostrando {registrosActualesPagina.length} de {registrosFiltradosTabla.length} registros</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#1d1736] border-b border-violet-400/20 text-violet-200">
                            <th className="p-3 whitespace-nowrap">Fecha</th>
                            {isAdmin && <th className="p-3 whitespace-nowrap">Auditor</th>}
                            <th className="p-3">Actividad</th>
                            <th className="p-3 whitespace-nowrap">Tiempo</th>
                            <th className="p-3 whitespace-nowrap">Estado</th>
                            <th className="p-3 text-center whitespace-nowrap">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                        {registrosActualesPagina.length === 0 ? (
                          <tr><td colSpan="6" className="p-4 text-center text-violet-200/70">No hay registros para este filtro</td></tr>
                        ) : (
                          registrosActualesPagina.map(r => (
                              <tr key={r.id} className="border-b border-violet-400/15 hover:bg-violet-800/25 transition">
                                  <td className="p-3 whitespace-nowrap">{formatDate(r.fecha)}</td>
                                  {isAdmin && <td className="p-3 font-medium text-white whitespace-nowrap">{r.auditor}</td>}
                                  <td className="p-3">{r.actividad} {Number(r.tiene_evidencia) > 0 && <Paperclip size={13} className="inline text-fuchsia-300 ml-1" title="Posee archivo de evidencia" />}</td>
                                  <td className="p-3 font-bold text-violet-200 whitespace-nowrap">{formatTime(r.horas_generadas_minutos)} hrs</td>
                                  <td className="p-3 whitespace-nowrap">{renderBadgeEstado(r.estado)}</td>
                                  <td className="p-3 flex justify-center gap-2 items-center whitespace-nowrap">
                                      <button onClick={() => verDetallesRegistro(r.id)} className="text-violet-200 hover:text-white transition" title="Ver Detalle"><Eye size={16} /></button>

                                      {!isAdmin && (r.estado === 'Aprobado (Pendiente de Ejecución)' || r.estado === 'Autorizado') && String(r.usuario_id) === String(user.id) && (
                                        <button onClick={() => abrirEdicion(r)} className="bg-violet-600 hover:bg-violet-500 text-white px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition">
                                          <Check size={14} /> Finalizar / Evidencia
                                        </button>
                                      )}

                                      {(!isAdmin && r.estado === 'Pendiente') && (
                                        <button onClick={() => abrirEdicion(r)} className="text-violet-200 hover:text-white transition" title="Editar"><Edit size={16} /></button>
                                      )}

                                      {!isAdmin && r.estado !== 'Ejecutado' && String(r.usuario_id) === String(user.id) && (
                                        <button onClick={() => eliminarRegistroFallido(r)} className="text-rose-300 hover:text-rose-200 transition" title="Eliminar auditoría no realizada"><Trash2 size={16} /></button>
                                      )}

                                      {isAdmin && (r.estado === 'Pendiente' || r.estado === 'Revisión por Exceso de Horas') && (
                                        <>
                                          <button onClick={() => cambiarEstado(r.id, 'Aprobado (Pendiente de Ejecución)')} className="text-violet-100 bg-violet-800/70 hover:bg-violet-700/80 px-2 py-1 rounded text-[11px] font-medium border border-violet-400/35 transition">Aprobar</button>
                                          <button onClick={() => cambiarEstado(r.id, 'Rechazado')} className="text-rose-200 bg-rose-900/70 hover:bg-rose-800/80 px-2 py-1 rounded text-[11px] font-medium border border-rose-400/35 transition">Rechazar</button>
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
                    <div className="p-3 bg-[#2a214d] border-t border-violet-400/20 flex justify-between items-center text-xs">
                      <button
                        disabled={paginaActual === 1}
                        onClick={() => setPaginaActual(p => Math.max(p - 1, 1))}
                        className="px-3 py-1 bg-[#1b1533] text-violet-100 border border-violet-400/35 rounded disabled:opacity-40 flex items-center gap-1 font-medium hover:bg-violet-800/45 transition"
                      >
                        <ChevronLeft size={14} /> Anterior
                      </button>
                      <span className="text-violet-100 font-bold">Página {paginaActual} de {Math.ceil(registrosFiltradosTabla.length / registrosPorPagina)}</span>
                      <button
                        disabled={paginaActual === Math.ceil(registrosFiltradosTabla.length / registrosPorPagina)}
                        onClick={() => setPaginaActual(p => Math.min(p + 1, Math.ceil(registrosFiltradosTabla.length / registrosPorPagina)))}
                        className="px-3 py-1 bg-[#1b1533] text-violet-100 border border-violet-400/35 rounded disabled:opacity-40 flex items-center gap-1 font-medium hover:bg-violet-800/45 transition"
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
      const mostrarColumnaAccionAdmin = isAdmin && filasCompensacionesUnificadas.some(f => f.estado === 'Pendiente' && f.solicitudOriginal);

      return (
        <div className="space-y-4">
          {/* FILTROS EN LA PÁGINA DE COMPENSACIONES */}
          <div className="bg-[#231c40] p-4 rounded-xl shadow-lg border border-violet-400/25 flex flex-wrap gap-3 items-center justify-between text-xs text-violet-50">
            <div className="flex items-center gap-2 text-violet-100 font-bold"><Filter size={16} className="text-fuchsia-300"/> <span>Filtros de Compensaciones:</span></div>
            <div className="flex flex-wrap gap-2 items-center">
              {isAdmin && (
                <select value={compFiltroUsuario} onChange={e => setCompFiltroUsuario(e.target.value)} className="border border-violet-400/35 rounded-lg p-2 text-xs bg-[#181230] text-violet-50 outline-none focus:border-violet-300">
                  <option value="todos">👥 Todos los Auditores</option>
                  {auditoresSoloAuditores.map(u => (<option key={u.id} value={u.id}>{u.nombre}</option>))}
                </select>
              )}
              <select value={compFiltroAnio} onChange={e => setCompFiltroAnio(e.target.value)} className="border border-violet-400/35 rounded-lg p-2 text-xs bg-[#181230] text-violet-50 outline-none focus:border-violet-300">
                <option value="todos">📅 Todos los Años</option><option value="2025">2025</option><option value="2026">2026</option><option value="2027">2027</option>
              </select>
              <select value={compFiltroMes} onChange={e => setCompFiltroMes(e.target.value)} className="border border-violet-400/35 rounded-lg p-2 text-xs bg-[#181230] text-violet-50 outline-none focus:border-violet-300">
                <option value="todos">📆 Todos los Meses</option><option value="01">Enero</option><option value="02">Febrero</option><option value="03">Marzo</option><option value="04">Abril</option><option value="05">Mayo</option><option value="06">Junio</option><option value="07">Julio</option><option value="08">Agosto</option><option value="09">Septiembre</option><option value="10">Octubre</option><option value="11">Noviembre</option><option value="12">Diciembre</option>
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center bg-[#231c40] p-3.5 rounded-xl shadow-lg border border-violet-400/25 text-violet-50">
            <div>
              <h2 className="text-base font-bold text-white">
                {isAdmin ? 'Historial de Compensaciones' : 'Mi Historial de Compensaciones'}
              </h2>
              {!isAdmin && <p className="text-violet-200/75 text-xs">Detalle unificado de solicitudes y horas descontadas ({formatTime(stats.pendientes)} hrs a favor)</p>}
            </div>
            {isAdmin ? (
              <button onClick={() => setShowModalComp(true)} className="bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex gap-1.5 items-center shadow transition"><Plus size={16} /> Registrar Compensación</button>
            ) : (
              <button onClick={() => setShowModalSolicitudComp(true)} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex gap-1.5 items-center shadow transition"><Plus size={16} /> Solicitar Compensación</button>
            )}
          </div>

          <div className="bg-[#231c40] rounded-xl shadow-lg border border-violet-400/25 overflow-hidden text-xs text-violet-50">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#1d1736] border-b border-violet-400/20 text-violet-200">
                    <th className="p-3 whitespace-nowrap">Fecha Solicitud</th>
                    {isAdmin && <th className="p-3 whitespace-nowrap">Auditor</th>}
                    <th className="p-3">Motivo</th>
                    <th className="p-3 whitespace-nowrap">Estado</th>
                    <th className="p-3 whitespace-nowrap">Fecha Asignación / Respuesta</th>
                    <th className="p-3 whitespace-nowrap">Horas Compensadas</th>
                    {mostrarColumnaAccionAdmin && <th className="p-3 text-center whitespace-nowrap">Acción</th>}
                  </tr>
                </thead>
                <tbody>
                  {filasCompensacionesUnificadas.length === 0 ? (
                    <tr><td colSpan={isAdmin ? (mostrarColumnaAccionAdmin ? "7" : "6") : "5"} className="p-4 text-center text-violet-200/70">No hay compensaciones registradas para este filtro.</td></tr>
                  ) : (
                    filasCompensacionesUnificadas.map(item => (
                      <tr key={item.key} className="border-b border-violet-400/15 hover:bg-violet-800/25 transition">
                        <td className="p-3 whitespace-nowrap">{item.fechaSolicitud ? formatDate(item.fechaSolicitud) : '—'}</td>
                        {isAdmin && <td className="p-3 font-medium text-white whitespace-nowrap">{item.auditor}</td>}
                        <td className="p-3">
                          {item.motivo} {item.observaciones ? <span className="text-violet-200/70">({item.observaciones})</span> : null}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {(item.estado === 'Aprobada' || item.estado === 'Asignada') && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-900/60 text-emerald-200 border border-emerald-400/35">
                              {item.estado === 'Aprobada' ? 'Aprobada y Asignada' : 'Asignada'}
                            </span>
                          )}
                          {item.estado === 'Rechazada' && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-900/65 text-rose-200 border border-rose-400/35">Rechazada</span>
                          )}
                          {item.estado === 'Pendiente' && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-900/65 text-amber-200 border border-amber-400/35">Pendiente</span>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">{item.fechaAsignacion ? formatDate(item.fechaAsignacion) : '—'}</td>
                        <td className={`p-3 font-bold whitespace-nowrap ${item.descontada ? 'text-rose-300' : (item.estado === 'Rechazada' ? 'text-violet-300/60' : 'text-violet-200')}`}>
                          {item.descontada
                            ? `-${formatTime(item.minutos).replace('-', '')} hrs (${item.minutos || 0} min)`
                            : `${formatTime(item.minutos)} hrs (${item.minutos || 0} min)`}
                        </td>
                        {mostrarColumnaAccionAdmin && (
                          <td className="p-3 text-center whitespace-nowrap">
                            {item.estado === 'Pendiente' && item.solicitudOriginal ? (
                              <div className="flex justify-center gap-2">
                                <button onClick={() => aprobarSolicitudCompensacion(item.solicitudOriginal)} className="bg-violet-600 text-white px-2.5 py-1 rounded text-[11px] font-bold hover:bg-violet-500 transition">Asignar / Aprobar</button>
                                <button onClick={() => rechazarSolicitudCompensacion(item.solicitudOriginal)} className="bg-rose-900/75 text-rose-200 border border-rose-400/35 px-2.5 py-1 rounded text-[11px] font-medium hover:bg-rose-800/80 transition">Rechazar</button>
                              </div>
                            ) : '—'}
                          </td>
                        )}
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
          <div className="flex justify-between items-center bg-[#231c40] p-3.5 rounded-xl shadow-lg border border-violet-400/25 text-violet-50">
            <div><h2 className="text-base font-bold text-white">Administración de Usuarios</h2></div>
            <button onClick={abrirCreacionUsuario} className="bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex gap-1.5 items-center shadow transition"><UserPlus size={16} /> Nuevo Usuario</button>
          </div>
          <div className="bg-[#231c40] rounded-xl shadow-lg border border-violet-400/25 overflow-hidden text-xs text-violet-50">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#1d1736] border-b border-violet-400/20 text-violet-200">
                    <th className="p-3 whitespace-nowrap">Nombre</th>
                    <th className="p-3 whitespace-nowrap">Correo</th>
                    <th className="p-3 whitespace-nowrap">Rol</th>
                    <th className="p-3 text-center whitespace-nowrap">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosDB.map(u => (
                    <tr key={u.id} className="border-b border-violet-400/15 hover:bg-violet-800/25 transition">
                      <td className="p-3 font-medium text-white whitespace-nowrap">{u.nombre}</td>
                      <td className="p-3 whitespace-nowrap">{u.email}</td>
                      <td className="p-3 whitespace-nowrap">{renderBadgeRol(u.rol)}</td>
                      <td className="p-3 text-center whitespace-nowrap"><button onClick={() => abrirEdicionUsuario(u)} className="text-fuchsia-300 hover:text-fuchsia-200 hover:underline font-medium">Editar</button></td>
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
    <div className="min-h-screen bg-[#16112b] text-violet-50 flex">
      {/* PANEL LATERAL CON BOTÓN DE CERRAR SESIÓN FIJO */}
      <aside className={`w-64 ${themeBg} text-white flex flex-col justify-between hidden md:flex shadow-2xl border-r border-violet-400/25 h-screen sticky top-0`}>
        <div className="overflow-y-auto">
          <div className="p-5 border-b border-violet-400/25 flex items-center gap-3">
            <img src={LOGO_URL} alt="Logo" className="w-10 h-10 object-contain bg-violet-900/70 border border-violet-300/30 rounded-lg p-1" />
            <div>
              <h1 className="font-bold text-sm leading-tight text-white">AUDITORÍAS ASACh</h1>
              <span className="text-[10px] text-violet-200/85">Panel de Administración</span>
            </div>
          </div>
          <nav className="p-3 space-y-1">
            <button onClick={() => setActiveTab('dashboard')} className={menuClass('dashboard')}><LayoutDashboard size={18} /> Dashboard Visual</button>
            <button onClick={() => setActiveTab('registros')} className={menuClass('registros')}><FileText size={18} /> Registro de Auditorías</button>
            <button onClick={() => setActiveTab('compensaciones')} className={menuClass('compensaciones')}><Clock size={18} /> Compensaciones</button>
            {isAdmin && <button onClick={() => setActiveTab('usuarios')} className={menuClass('usuarios')}><Users size={18} /> Usuarios</button>}
          </nav>
        </div>
        <div className="p-4 border-t border-violet-400/25 flex items-center justify-between text-xs bg-black/20 shrink-0">
          <div><p className="font-bold text-white">{user.nombre}</p><p className={`text-[11px] ${themeText}`}>{user.rol}</p></div>
          <button onClick={onLogout} className="p-2 hover:bg-violet-800/50 rounded-lg text-violet-100 hover:text-white transition flex items-center gap-1" title="Cerrar Sesión"><LogOut size={16} /> Cerrar Sesión</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[radial-gradient(ellipse_at_top_right,#321c61_0%,#16112b_55%)]">
        <header className="bg-[#1e1738]/90 backdrop-blur-md border-b border-violet-400/25 p-4 flex justify-between items-center shadow-lg">
          <div>
            <h2 className="text-xl font-bold text-white">Hola, {user.nombre ? user.nombre.split(' ')[0] : 'Usuario'}</h2>
            <p className="text-xs text-violet-200/80">Sistema de Control de Auditorías de remesa ASACh</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)} className="relative p-2 text-violet-100 bg-violet-900/70 border border-violet-400/35 hover:bg-violet-800/70 rounded-full transition shadow-sm">
                <Bell size={20} className="text-fuchsia-300" />
                {totalNotificacionesCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-fuchsia-500 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center font-bold shadow animate-pulse">
                    {totalNotificacionesCount}
                  </span>
                )}
              </button>

              {showNotificationsDropdown && (
                <div className="absolute right-0 mt-2 w-96 bg-[#231c40] rounded-2xl shadow-2xl border border-violet-400/35 z-50 overflow-hidden text-violet-50">
                  <div className="bg-gradient-to-r from-violet-800 to-purple-800 text-white p-3.5 flex justify-between items-center border-b border-violet-400/25">
                    <div className="flex items-center gap-2">
                      <Bell size={16} />
                      <span className="font-bold text-xs">{isAdmin ? 'Solicitudes Pendientes' : 'Mis Notificaciones'}</span>
                    </div>
                    {totalNotificacionesCount > 0 && (
                      <span className="bg-fuchsia-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-full">
                        {totalNotificacionesCount} nuevas
                      </span>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto p-3 space-y-2.5 bg-[#191333]">
                    {totalNotificacionesCount === 0 ? (
                      <p className="text-violet-200/60 text-center py-6 text-xs font-medium">No hay notificaciones pendientes.</p>
                    ) : (
                      isAdmin ? (
                        <>
                          {registrosNotif.map(r => (
                            <div
                              key={r.id}
                              onClick={() => { verDetallesRegistro(r.id); setShowNotificationsDropdown(false); }}
                              className="p-3 bg-[#271f47] hover:bg-violet-800/45 border border-violet-400/25 rounded-xl shadow-sm transition cursor-pointer relative group"
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-bold text-amber-200 bg-amber-900/70 border border-amber-400/35 px-2 py-0.5 rounded">
                                  {r.estado === 'Revisión por Exceso de Horas' ? 'Día / Horario Modificado' : (r.motivo || 'Auditoría')}
                                </span>
                                <span className="text-[10px] text-violet-200/70">{formatDate(r.fecha)}</span>
                              </div>
                              <p className="font-bold text-white text-xs">{r.auditor || 'Auditor'}</p>
                              <p className="text-[11px] text-violet-100/85 mt-0.5">⏰ Tiempo: {formatTime(r.horas_generadas_minutos)} hrs</p>
                              <p className="text-[11px] text-violet-100 truncate mt-1 bg-[#1b1533] p-1.5 rounded border border-violet-400/15">{r.actividad}</p>
                              <ChevronRight size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-violet-300/60 group-hover:text-fuchsia-300 transition" />
                            </div>
                          ))}

                          {solicitudesCompNotifAdmin.map(s => (
                            <div
                              key={`solcomp-${s.id}`}
                              onClick={() => { setActiveTab('compensaciones'); setShowNotificationsDropdown(false); }}
                              className="p-3 bg-[#271f47] hover:bg-violet-800/45 border border-fuchsia-400/30 rounded-xl shadow-sm transition cursor-pointer relative group"
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-bold text-fuchsia-200 bg-fuchsia-900/70 border border-fuchsia-400/35 px-2 py-0.5 rounded">
                                  Solicitud de Compensación
                                </span>
                                <span className="text-[10px] text-violet-200/70">{formatDate(s.fecha)}</span>
                              </div>
                              <p className="font-bold text-white text-xs">{s.auditor || 'Auditor'}</p>
                              <p className="text-[11px] text-fuchsia-200 font-bold mt-0.5">⏰ Solicita: {formatTime(s.horas_solicitadas_minutos)} hrs</p>
                              <p className="text-[11px] text-violet-100 truncate mt-1 bg-[#1b1533] p-1.5 rounded border border-violet-400/15">{s.motivo}</p>
                              <ChevronRight size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-violet-300/60 group-hover:text-fuchsia-300 transition" />
                            </div>
                          ))}
                        </>
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
                              className="p-3 bg-[#271f47] hover:bg-violet-800/45 border border-violet-400/25 rounded-xl shadow-sm transition cursor-pointer relative group"
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${r.estado === 'Rechazado' ? 'text-rose-200 bg-rose-900/70 border border-rose-400/35' : 'text-violet-100 bg-violet-800/70 border border-violet-400/35'}`}>
                                  {r.estado === 'Rechazado' ? 'Propuesta Rechazada' : 'Propuesta Aprobada'}
                                </span>
                                <span className="text-[10px] text-violet-200/70">{formatDate(r.fecha)}</span>
                              </div>
                              <p className="font-bold text-white text-xs truncate">Actividad: {r.actividad}</p>
                              <p className="text-[11px] text-violet-100/85 mt-0.5">⏰ Tiempo: {formatTime(r.horas_generadas_minutos)} hrs</p>
                              <ChevronRight size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-violet-300/60 group-hover:text-fuchsia-300 transition" />
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
                                className="p-3 bg-[#271f47] hover:bg-violet-800/45 border border-violet-400/25 rounded-xl shadow-sm transition cursor-pointer relative group"
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[10px] font-bold text-purple-100 bg-purple-900/70 border border-purple-400/35 px-2 py-0.5 rounded">
                                    Compensación Asignada / Registrada
                                  </span>
                                  <span className="text-[10px] text-violet-200/70">{formatDate(c.fecha)}</span>
                                </div>
                                <p className="font-bold text-white text-xs truncate">Motivo: {c.motivo}</p>
                                <p className="text-[11px] text-rose-300 font-bold mt-0.5">⏰ Compensado: -{formatTime(c.horas_compensadas_minutos)} hrs</p>
                                <ChevronRight size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-violet-300/60 group-hover:text-fuchsia-300 transition" />
                              </div>
                            );
                          })}
                        </>
                      )
                    )}
                  </div>

                  <div className="p-2.5 bg-[#231c40] border-t border-violet-400/25 text-center">
                    <button
                      onClick={() => { setActiveTab('dashboard'); setShowNotificationsDropdown(false); }}
                      className="text-xs font-bold text-violet-200 hover:text-white transition"
                    >
                      Ver todos en el panel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {activeTab === 'dashboard' && !isAdmin && (
              <button onClick={() => { setEditingId(null); setFormData({ fecha: new Date().toISOString().split('T')[0], hora_inicio: '', hora_termino: '', motivo: 'Auditoría', actividad: '', departamento: user.departamento }); setEvidenciasGuardadas([]); setShowModal(true); }} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-violet-950/60 transition">+ NUEVA PROPUESTA</button>
            )}
          </div>
        </header>
        <div className="p-6">{renderContent()}</div>
      </main>

      {/* MODAL CREAR / EDITAR REGISTRO CON SUBIDA FÍSICA A GCS */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#231c40] text-violet-50 border border-violet-400/35 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto text-xs">
            <h3 className="font-bold text-base mb-4 text-white">
              {editingId ? (!isAdmin && (editingEstado === 'Aprobado (Pendiente de Ejecución)' || editingEstado === 'Autorizado') ? 'Ejecutar e Informar Trabajo' : 'Editar Registro') : 'Nueva Propuesta de Horas'}
            </h3>
            <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
              <div><label className="block font-medium mb-1 text-violet-100">Fecha</label><input type="date" required value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} className="w-full border border-violet-400/35 rounded-lg p-2 bg-[#181230] text-white outline-none focus:border-violet-300" /></div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="block font-medium mb-1 text-violet-100">Hora Inicio (HH:MM)</label><input type="time" required value={formData.hora_inicio} onChange={e => setFormData({...formData, hora_inicio: e.target.value})} className="w-full border border-violet-400/35 rounded-lg p-2 bg-[#181230] text-white outline-none focus:border-violet-300" /></div>
                <div><label className="block font-medium mb-1 text-violet-100">Hora Término (HH:MM)</label><input type="time" required value={formData.hora_termino} onChange={e => setFormData({...formData, hora_termino: e.target.value})} className="w-full border border-violet-400/35 rounded-lg p-2 bg-[#181230] text-white outline-none focus:border-violet-300" /></div>
              </div>

              {formData.hora_inicio && formData.hora_termino && (
                <div className="bg-violet-900/60 border border-violet-400/35 text-violet-100 p-2.5 rounded-lg flex justify-between items-center font-medium">
                  <span>Tiempo total calculado:</span>
                  <span className="font-bold text-white">{formatTime(calcularMinutos())} hrs ({calcularMinutos()} minutos)</span>
                </div>
              )}

              <div>
                <label className="block font-medium mb-1 text-violet-100">
                  {!isAdmin && (editingEstado === 'Aprobado (Pendiente de Ejecución)' || editingEstado === 'Autorizado') ? 'Informe Detallado de la Actividad Ejecutada' : 'Actividad Realizada / Propuesta'}
                </label>
                <textarea rows="4" required value={formData.actividad} onChange={e => setFormData({...formData, actividad: e.target.value})} className="w-full border border-violet-400/35 rounded-lg p-2 bg-[#181230] text-white outline-none focus:border-violet-300" placeholder="Describa el informe de la auditoría..."></textarea>
              </div>

              {/* SECCIÓN DE SUBIDA Y GESTIÓN DE EVIDENCIAS EN GOOGLE CLOUD STORAGE */}
              <div className="p-3.5 border border-dashed border-violet-400/40 rounded-xl bg-[#191333] space-y-2.5 text-left">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-fuchsia-300 flex items-center gap-1.5">
                    <Upload size={14} /> Adjuntar Evidencias (Google Cloud Storage)
                  </label>
                  {subiendoArchivo && <span className="text-[11px] font-bold text-violet-200 animate-pulse">Subiendo archivo...</span>}
                </div>

                {editingId ? (
                  <>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt"
                      disabled={subiendoArchivo}
                      onChange={(e) => handleFileUpload(e, editingId)}
                      className="w-full text-xs text-violet-200/85 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-violet-800/80 file:text-white hover:file:bg-violet-700 cursor-pointer disabled:opacity-50"
                    />

                    {evidenciasGuardadas.length > 0 ? (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[11px] font-bold text-purple-200">📎 Archivos vinculados ({evidenciasGuardadas.length}):</p>
                        {evidenciasGuardadas.map((ev) => (
                          <div key={ev.id} className="bg-[#271f47] p-2 rounded-lg border border-violet-400/30 flex items-center justify-between shadow-sm">
                            <span className="text-[11px] font-medium text-violet-50 truncate max-w-[230px]" title={ev.nombre_archivo}>
                              {ev.nombre_archivo}
                            </span>
                            <div className="flex items-center gap-2">
                              <a
                                href={ev.archivo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-fuchsia-300 hover:underline flex items-center gap-1 font-bold text-[11px]"
                                title="Ver archivo"
                              >
                                Ver <ExternalLink size={12} />
                              </a>
                              <button
                                type="button"
                                onClick={() => handleDeleteEvidencia(ev.id)}
                                className="text-rose-300 hover:text-rose-200 p-1 rounded hover:bg-rose-900/50 transition"
                                title="Eliminar archivo"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-violet-200/70 italic">Aún no hay archivos adjuntos. Puedes subir uno o más archivos antes de finalizar.</p>
                    )}
                  </>
                ) : (
                  <p className="text-[10px] text-violet-200/70 italic">💡 Nota: Guarda esta nueva propuesta primero para poder adjuntar y gestionar archivos de evidencia en la nube.</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-violet-400/25">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-violet-400/35 rounded-lg text-violet-100 hover:bg-violet-800/40 transition">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-bold transition">Guardar Cambios</button>
                {!isAdmin && (editingEstado === 'Aprobado (Pendiente de Ejecución)' || editingEstado === 'Autorizado') && (
                  <button type="button" onClick={(e) => handleSubmit(e, true)} className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-lg font-bold flex items-center gap-1.5 shadow transition">
                    <Check size={16} /> Finalizar Trabajo
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {showModalComp && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#231c40] text-violet-50 border border-violet-400/35 rounded-2xl p-6 w-full max-w-md shadow-2xl text-xs space-y-4">
            <h3 className="font-bold text-base text-white">Registrar Compensación (Descuento de Horas)</h3>
            <form onSubmit={handleCompSubmit} className="space-y-3">
              <div>
                <label className="font-medium text-violet-100">Seleccionar Auditor</label>
                <select required value={compData.usuario_id} onChange={e => setCompData({...compData, usuario_id: e.target.value})} className="w-full border border-violet-400/35 rounded p-2 bg-[#181230] text-white outline-none">
                  <option value="">-- Seleccione Auditor --</option>
                  {auditoresSoloAuditores.map(u => (<option key={u.id} value={u.id}>{u.nombre}</option>))}
                </select>
              </div>

              {compData.usuario_id && (
                <div className={`p-3 rounded-xl border flex items-center justify-between ${obtenerSaldoAuditorSeleccionado(compData.usuario_id) > 0 ? 'bg-violet-900/60 border-violet-400/40 text-violet-100' : 'bg-amber-900/65 border-amber-400/40 text-amber-100'}`}>
                  <div className="flex items-center gap-2">
                    <Clock size={16} />
                    <span className="font-medium">Horas pendientes a compensar:</span>
                  </div>
                  <span className="text-sm font-extrabold text-white">{formatTime(obtenerSaldoAuditorSeleccionado(compData.usuario_id))} hrs ({obtenerSaldoAuditorSeleccionado(compData.usuario_id)} min)</span>
                </div>
              )}

              <div><label className="font-medium text-violet-100">Fecha</label><input type="date" required value={compData.fecha} onChange={e => setCompData({...compData, fecha: e.target.value})} className="w-full border border-violet-400/35 rounded p-2 bg-[#181230] text-white outline-none" /></div>
              <div><label className="font-medium text-violet-100">Tiempo a Descontar (Ej: 01:30 para 1h 30m)</label><input type="text" placeholder="HH:MM" required value={compData.horas} onChange={e => setCompData({...compData, horas: e.target.value})} className="w-full border border-violet-400/35 rounded p-2 bg-[#181230] text-white outline-none" /></div>

              <div>
                <label className="font-medium text-violet-100">Motivo</label>
                <select value={compData.motivo} onChange={e => setCompData({...compData, motivo: e.target.value})} className="w-full border border-violet-400/35 rounded p-2 bg-[#181230] text-white outline-none">
                  <option value="Salida anticipada">Salida anticipada</option>
                  <option value="Medio día">Medio día</option>
                  <option value="Día libre">Día libre</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModalComp(false)} className="px-3 py-1.5 border border-violet-400/35 rounded text-violet-100 hover:bg-violet-800/40">Cancelar</button>
                <button type="submit" className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded font-bold">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SOLICITAR COMPENSACIÓN (AUDITOR) */}
      {showModalSolicitudComp && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#231c40] text-violet-50 border border-violet-400/35 rounded-2xl p-6 w-full max-w-md shadow-2xl text-xs space-y-4">
            <h3 className="font-bold text-base text-white">Solicitar Compensación de Horas</h3>
            <div className={`p-3 rounded-xl border flex items-center justify-between ${obtenerSaldoAuditorSeleccionado(user.id) > 0 ? 'bg-violet-900/60 border-violet-400/40 text-violet-100' : 'bg-amber-900/65 border-amber-400/40 text-amber-100'}`}>
              <div className="flex items-center gap-2">
                <Clock size={16} />
                <span className="font-medium">Tu saldo disponible:</span>
              </div>
              <span className="text-sm font-extrabold text-white">{formatTime(obtenerSaldoAuditorSeleccionado(user.id))} hrs</span>
            </div>
            <form onSubmit={handleSolicitudCompSubmit} className="space-y-3">
              <div><label className="font-medium text-violet-100">Fecha solicitada</label><input type="date" required value={solicitudCompData.fecha} onChange={e => setSolicitudCompData({...solicitudCompData, fecha: e.target.value})} className="w-full border border-violet-400/35 rounded p-2 bg-[#181230] text-white outline-none" /></div>
              <div><label className="font-medium text-violet-100">Tiempo a Solicitar (Ej: 01:30 para 1h 30m)</label><input type="text" placeholder="HH:MM" required value={solicitudCompData.horas} onChange={e => setSolicitudCompData({...solicitudCompData, horas: e.target.value})} className="w-full border border-violet-400/35 rounded p-2 bg-[#181230] text-white outline-none" /></div>
              <div>
                <label className="font-medium text-violet-100">Motivo</label>
                <select value={solicitudCompData.motivo} onChange={e => setSolicitudCompData({...solicitudCompData, motivo: e.target.value})} className="w-full border border-violet-400/35 rounded p-2 bg-[#181230] text-white outline-none">
                  <option value="Salida anticipada">Salida anticipada</option>
                  <option value="Medio día">Medio día</option>
                  <option value="Día libre">Día libre</option>
                </select>
              </div>
              <div>
                <label className="font-medium text-violet-100">Observaciones (Opcional)</label>
                <input type="text" placeholder="Detalle adicional..." value={solicitudCompData.observaciones} onChange={e => setSolicitudCompData({...solicitudCompData, observaciones: e.target.value})} className="w-full border border-violet-400/35 rounded p-2 bg-[#181230] text-white outline-none" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModalSolicitudComp(false)} className="px-3 py-1.5 border border-violet-400/35 rounded text-violet-100 hover:bg-violet-800/40">Cancelar</button>
                <button type="submit" className="px-3 py-1.5 bg-fuchsia-600 text-white rounded font-bold hover:bg-fuchsia-500">Enviar Solicitud</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE CON ENLACE DE GCS */}
      {registroDetalle && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#231c40] text-violet-50 border border-violet-400/35 rounded-2xl p-6 w-full max-w-md shadow-2xl text-xs space-y-3 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-base text-white">Detalle del Trabajo Propuesto</h3>
            <p><strong className="text-violet-200">Fecha:</strong> {formatDate(registroDetalle.fecha)}</p>
            <p><strong className="text-violet-200">Auditor:</strong> {registroDetalle.auditor}</p>
            <p><strong className="text-violet-200">Horario:</strong> {registroDetalle.hora_inicio && registroDetalle.hora_termino ? `${registroDetalle.hora_inicio} - ${registroDetalle.hora_termino}` : 'Sin horario'}</p>
            <p><strong className="text-violet-200">Tiempo Total:</strong> {formatTime(registroDetalle.horas_generadas_minutos)} hrs ({registroDetalle.horas_generadas_minutos || 0} min)</p>
            <p><strong className="text-violet-200">Actividad / Informe:</strong> {registroDetalle.actividad}</p>
            <p><strong className="text-violet-200">Estado Actual:</strong> {renderBadgeEstado(registroDetalle.estado)}</p>

            <div className="p-3 bg-[#191333] rounded-xl border border-violet-400/25 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-violet-100 flex items-center gap-1.5">
                  <Paperclip size={14} className="text-fuchsia-300" /> Evidencia en la Nube (GCS):
                </span>
                <span className={`text-[10px] font-bold ${registroDetalle.evidencias && registroDetalle.evidencias.length > 0 ? 'text-purple-200' : 'text-violet-300/60'}`}>
                  {registroDetalle.evidencias && registroDetalle.evidencias.length > 0 ? `${registroDetalle.evidencias.length} archivo(s)` : 'Sin adjuntos'}
                </span>
              </div>

              {registroDetalle.evidencias && registroDetalle.evidencias.length > 0 ? (
                registroDetalle.evidencias.map((ev, i) => (
                  <div key={i} className="bg-[#271f47] p-2.5 rounded-lg border border-violet-400/25 flex items-center justify-between shadow-sm">
                    <span className="text-[11px] font-medium text-violet-50 truncate max-w-[220px]">
                      {ev.nombre_archivo || 'Archivo de evidencia'}
                    </span>
                    <a
                      href={ev.archivo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-fuchsia-300 hover:underline flex items-center gap-1 font-bold text-[11px] whitespace-nowrap"
                    >
                      Abrir Archivo <ExternalLink size={12} />
                    </a>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-violet-200/60 italic">No se ha subido ningún archivo de evidencia a Google Cloud para este registro.</p>
              )}
            </div>

            {isAdmin && (registroDetalle.estado === 'Pendiente' || registroDetalle.estado === 'Revisión por Exceso de Horas') && (
              <div className="flex gap-2 pt-3 border-t border-violet-400/25 mt-3">
                <button onClick={() => cambiarEstado(registroDetalle.id, 'Aprobado (Pendiente de Ejecución)')} className="flex-1 bg-violet-600 hover:bg-violet-500 text-white py-2 rounded-lg font-bold transition">
                  {registroDetalle.estado === 'Revisión por Exceso de Horas' ? 'Aprobar Cambio' : 'Aprobar'}
                </button>
                <button onClick={() => cambiarEstado(registroDetalle.id, 'Rechazado')} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2 rounded-lg font-bold transition">Rechazar</button>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button onClick={() => setRegistroDetalle(null)} className="px-4 py-2 bg-violet-900/70 border border-violet-400/35 text-violet-100 hover:bg-violet-800/70 rounded-lg font-medium transition">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {showModalUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#231c40] text-violet-50 border border-violet-400/35 rounded-2xl p-6 w-full max-w-md shadow-2xl text-xs space-y-4">
            <h3 className="font-bold text-base text-white">{editingUserId ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
            {userError && <div className="bg-rose-950/75 border border-rose-500/40 text-rose-200 p-2 rounded">{userError}</div>}
            <form onSubmit={handleUserSubmit} className="space-y-3">
              <div><label className="font-medium text-violet-100">Nombre</label><input type="text" required value={userData.nombre} onChange={e => setUserData({...userData, nombre: e.target.value})} className="w-full border border-violet-400/35 rounded p-2 bg-[#181230] text-white outline-none" /></div>
              <div><label className="font-medium text-violet-100">Correo</label><input type="email" required value={userData.email} onChange={e => setUserData({...userData, email: e.target.value})} className="w-full border border-violet-400/35 rounded p-2 bg-[#181230] text-white outline-none" /></div>
              <div><label className="font-medium text-violet-100">Contraseña</label><input type="password" value={userData.password} onChange={e => setUserData({...userData, password: e.target.value})} className="w-full border border-violet-400/35 rounded p-2 bg-[#181230] text-white outline-none" placeholder="Dejar en blanco para conservar contraseña" /></div>
              <div><label className="font-medium text-violet-100">Confirmar Contraseña</label><input type="password" value={userData.confirmPassword} onChange={e => setUserData({...userData, confirmPassword: e.target.value})} className="w-full border border-violet-400/35 rounded p-2 bg-[#181230] text-white outline-none" placeholder="Confirmar contraseña" /></div>
              <div>
                <label className="font-medium text-violet-100">Rol</label>
                <select value={userData.rol} onChange={e => setUserData({...userData, rol: e.target.value})} className="w-full border border-violet-400/35 rounded p-2 bg-[#181230] text-white outline-none">
                  <option value="Auditor">Auditor</option>
                  <option value="Analista">Analista</option>
                  <option value="Administrador">Administrador</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModalUser(false)} className="px-3 py-1.5 border border-violet-400/35 rounded text-violet-100 hover:bg-violet-800/40">Cancelar</button>
                <button type="submit" className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded font-bold">Guardar</button>
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
    // Actualizar leyenda de la pestaña e ícono (favicon) violeta de auditoría
    document.title = 'Control de Auditorías | ASACh';
    const svgFavicon = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#7c3aed"/>
            <stop offset="100%" stop-color="#c026d3"/>
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="16" fill="url(#g)"/>
        <rect x="16" y="14" width="32" height="36" rx="5" fill="none" stroke="#ffffff" stroke-width="4"/>
        <line x1="23" y1="24" x2="41" y2="24" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="23" y1="32" x2="35" y2="32" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="43" cy="43" r="10" fill="#1e1738" stroke="#ffffff" stroke-width="3"/>
        <line x1="50" y1="50" x2="56" y2="56" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>
      </svg>
    `.trim();
    const faviconUrl = `data:image/svg+xml,${encodeURIComponent(svgFavicon)}`;
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = faviconUrl;

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