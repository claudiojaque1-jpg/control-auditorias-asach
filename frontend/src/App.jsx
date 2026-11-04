import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { LayoutDashboard, Clock, FileText, Users, LogOut, Plus, AlertTriangle, Paperclip, Lock, User, UserPlus, Eye, Edit, CheckCircle, Filter, Bell, ChevronRight, Check, Upload, ExternalLink, ChevronLeft } from 'lucide-react';
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
  const themeText = isAdmin ? 'text-teal-800' : 'text-blue-900';

  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({ generadas: 0, compensadas: 0, pendientes: 0, auditores: 0, porAprobar: 0 });

  const [registros, setRegistros] = useState([]);
  const [compensaciones, setCompensaciones] = useState([]);
  const [usuariosDB, setUsuariosDB] = useState([]);

  const [dashFiltroAnio, setDashFiltroAnio] = useState('2026');
  const [dashFiltroMes, setDashFiltroMes] = useState('todos');
  const [dashFiltroUsuario, setDashFiltroUsuario] = useState('todos');

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
  const [nombreArchivoGuardado, setNombreArchivoGuardado] = useState(null);

  const [formData, setFormData] = useState({ fecha: new Date().toISOString().split('T')[0], hora_inicio: '', hora_termino: '', motivo: 'Auditoría', actividad: '', departamento: user.departamento });
  const [compData, setCompData] = useState({ fecha: new Date().toISOString().split('T')[0], horas: '', motivo: 'Salida anticipada', observaciones: '', usuario_id: '' });

  const [editingUserId, setEditingUserId] = useState(null);
  const [userData, setUserData] = useState({ nombre: '', email: '', password: '', confirmPassword: '', departamento: '', rol: 'Auditor' });
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
        const res = await fetch(`${API_URL}/api/registros/${id}`);
        if(res.ok) {
          const data = await res.json();
          setRegistroDetalle(data);
          if (data.nombre_archivo_evidencia) {
            setNombreArchivoGuardado(data.nombre_archivo_evidencia);
          }
        }
    } catch(err) { alert("⚠️ Error de conexión."); }
  };

  const abrirEdicion = async (r) => {
      setEditingId(r.id);
      setEditingEstado(r.estado);
      setMinutosOriginales(r.horas_generadas_minutos || 0);
      setHorarioOriginal({ inicio: r.hora_inicio || '', termino: r.hora_termino || '' });
      setFormData({ fecha: r.fecha, hora_inicio: r.hora_inicio || '', hora_termino: r.hora_termino || '', motivo: r.motivo, actividad: r.actividad, departamento: r.departamento || user.departamento });
      setNombreArchivoGuardado(r.nombre_archivo_evidencia || null);
      try {
          const res = await fetch(`${API_URL}/api/registros/${r.id}`);
          if(res.ok) {
              const data = await res.json();
              setIntervinientes(data.intervinientes || []);
              if(data.nombre_archivo_evidencia) setNombreArchivoGuardado(data.nombre_archivo_evidencia);
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

  // FUNCIÓN PARA SUBIR ARCHIVOS DIRECTAMENTE A GOOGLE CLOUD STORAGE
  const handleFileUpload = async (e, registroId) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!registroId) {
      alert("⚠️ Primero debes guardar el registro antes de adjuntar evidencia.");
      return;
    }

    const formDataUpload = new FormData();
    formDataUpload.append('archivo', file);
    formDataUpload.append('registro_id', registroId);

    try {
      const res = await fetch(`${API_URL}/api/evidencias`, {
        method: 'POST',
        body: formDataUpload
      });
      const data = await res.json();
      if (res.ok) {
        setNombreArchivoGuardado(file.name);
        alert("✅ Archivo subido exitosamente a Google Cloud Storage.");
        fetchData();
      } else {
        alert(`⚠️ Error al subir archivo: ${data.error}`);
      }
    } catch (err) {
      alert("⚠️ Error de conexión al subir la evidencia.");
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
      estado: nuevoEstado,
      tiene_evidencia: nombreArchivoGuardado ? 1 : 0,
      nombre_archivo_evidencia: nombreArchivoGuardado
    };

    if (editingId) {
        await fetch(`${API_URL}/api/registros/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } else {
        await fetch(`${API_URL}/api/registros`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }

    setShowModal(false); setEditingId(null); setIntervinientes([]); setNombreArchivoGuardado(null);
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
    if(!compData.usuario_id) return alert("Por favor, seleccione el auditor.");

    let totalMinutos = 0;
    if (compData.horas.includes(':')) {
      const [h, m] = compData.horas.split(':').map(Number);
      totalMinutos = (h * 60) + (m || 0);
    } else {
      totalMinutos = Number(compData.horas) * 60;
    }

    if (isNaN(totalMinutos) || totalMinutos <= 0) return alert("Por favor, ingrese un tiempo válido en formato HH:MM o minutos.");

    const saldoRealMinutos = obtenerSaldoAuditorSeleccionado(compData.usuario_id);

    if (totalMinutos > saldoRealMinutos) return alert(`⚠️ Las horas a descontar superan el saldo pendiente de este auditor (${formatTime(saldoRealMinutos)} hrs disponibles).`);

    const res = await fetch(`${API_URL}/api/compensaciones`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...compData, horas_compensadas_minutos: totalMinutos })
    });

    if (res.ok) {
      const usuarioDestino = usuariosDB.find(u => String(u.id) === String(compData.usuario_id));
      if (usuarioDestino && usuarioDestino.email) {
        const asunto = encodeURIComponent("Notificación de Compensación Registrada - Remesas ASACh");
        const cuerpo = encodeURIComponent(`Hola ${usuarioDestino.nombre},\n\nSe ha registrado una compensación de horas en tu cuenta:\n\n📅 Fecha: ${compData.fecha}\n⏰ Horas descontadas: ${formatTime(totalMinutos)} hrs\n📌 Motivo: ${compData.motivo}\n\nSaldo restante disponible: ${formatTime(saldoRealMinutos - totalMinutos)} hrs.\n\nSaludos,\nAdministración de Remesas ASACh`);
        window.open(`mailto:${usuarioDestino.email}?subject=${asunto}&body=${cuerpo}`, '_blank');
      }
    }

    setShowModalComp(false); setCompData({ fecha: new Date().toISOString().split('T')[0], horas: '', motivo: 'Salida anticipada', observaciones: '', usuario_id: '' }); fetchData();
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

        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok) { setUserError(`⚠️ ${data.error || 'Error al guardar usuario'}`); return; }

        setShowModalUser(false);
        fetchData();
    } catch(err) { setUserError('⚠️ Error de conexión.'); }
  };

  const renderBadgeEstado = (estado) => {
      switch(estado) {
          case 'Ejecutado':
              return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-green-100 text-green-800 whitespace-nowrap">Ejecutado</span>;
          case 'Aprobado (Pendiente de Ejecución)':
          case 'Autorizado':
              return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 whitespace-nowrap">Aprobado (Pendiente de Ejecución)</span>;
          case 'Revisión por Exceso de Horas':
              return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 whitespace-nowrap">Revisión por Cambio de Horario</span>;
          case 'Rechazado':
              return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 whitespace-nowrap">Rechazado</span>;
          default:
              return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-yellow-100 text-yellow-800 whitespace-nowrap">Pendiente Autorización</span>;
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

  const cantEjecutadas = registros.filter(r => r.estado === 'Ejecutado').length;
  const cantPendientes = registros.filter(r => r.estado === 'Pendiente' || r.estado === 'Revisión por Exceso de Horas').length;
  const cantAprobadasPendientes = registros.filter(r => r.estado === 'Aprobado (Pendiente de Ejecución)' || r.estado === 'Autorizado').length;
  const cantRechazadas = registros.filter(r => r.estado === 'Rechazado').length;

  const estadoData = [
    { name: 'Ejecutadas', value: cantEjecutadas, color: '#10b981' },
    { name: 'Pendientes / Modificadas', value: cantPendientes, color: '#f59e0b' },
    { name: 'Aprobadas (Pend. Ejecución)', value: cantAprobadasPendientes, color: '#3b82f6' },
    ...(cantRechazadas > 0 ? [{ name: 'Rechazadas', value: cantRechazadas, color: '#ef4444' }] : [])
  ].filter(d => d.value > 0);

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

  const solicitudesPendientes = isAdmin
    ? rawRegistros.filter(r => r.estado === 'Pendiente' || r.estado === 'Revisión por Exceso de Horas')
    : rawCompensaciones.filter(c => String(c.usuario_id) === String(user.id));

  const indiceUltimoRegistro = paginaActual * registrosPorPagina;
  const indicePrimerRegistro = indiceUltimoRegistro - registrosPorPagina;
  const registrosActuales = registros.slice(indicePrimerRegistro, indiceUltimoRegistro);
  const totalPaginas = Math.ceil(registros.length / registrosPorPagina);

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
                          {auditoresSoloAuditores.map(u => (<option key={u.id} value={u.id}>{u.nombre}</option>))}
                      </select>
                  </div>
              </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-emerald-500 flex flex-col justify-between"><p className="text-gray-400 text-xs font-semibold uppercase">Ejecutadas</p><h2 className={`text-2xl font-extrabold mt-1 ${themeText}`}>{formatTime(stats.generadas)}</h2></div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500 flex flex-col justify-between"><p className="text-gray-400 text-xs font-semibold uppercase">Compensadas</p><h2 className="text-2xl font-extrabold text-blue-600 mt-1">{formatTime(stats.compensadas)}</h2></div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-indigo-500 flex flex-col justify-between"><p className="text-gray-400 text-xs font-semibold uppercase">Saldo (A favor)</p><h2 className="text-2xl font-extrabold text-indigo-600 mt-1">{formatTime(stats.pendientes)}</h2></div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-amber-500 flex flex-col justify-between"><p className="text-amber-700 text-xs font-semibold uppercase">En Propuesta</p><h2 className="text-2xl font-extrabold text-amber-500 mt-1">{registros.filter(r => r.estado === 'Pendiente').length}</h2></div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-gray-400 flex flex-col justify-between"><p className="text-gray-400 text-xs font-semibold uppercase">{isAdmin ? "Auditores Activos" : "Mis Registros"}</p><h2 className="text-2xl font-extrabold text-gray-700 mt-1">{isAdmin ? stats.auditores : registros.length}</h2></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 lg:col-span-2 flex flex-col justify-between">
              <h3 className="font-bold text-gray-700 text-sm mb-3">Tendencia de Horas Reales (por Mes en Hrs)</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={tendenciaData}>
                    <XAxis dataKey="mes" stroke="#888888" fontSize={12} />
                    <YAxis stroke="#888888" fontSize={12} />
                    <RechartsTooltip formatter={(value) => [`${value} hrs`, '']} />
                    <Legend />
                    <Line type="monotone" dataKey="Realizadas" stroke="#059669" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Compensadas" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <h3 className="font-bold text-gray-700 text-sm mb-3">Distribución por Estado</h3>
              <div className="h-64 w-full flex items-center justify-center">
                {estadoData.length === 0 ? (
                  <p className="text-gray-400 text-xs">Sin datos registrados</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={estadoData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} fill="#8884d8" label={({ name, value }) => `${name}: ${value}`}>
                        {estadoData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-700 text-sm mb-3">Comparativa por Auditor: Horas Aprobadas vs Compensadas (en Hrs)</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={auditoresDataDoble}>
                    <XAxis dataKey="nombre" stroke="#888888" fontSize={12} />
                    <YAxis stroke="#888888" fontSize={12} />
                    <RechartsTooltip formatter={(value) => [`${value} hrs`, '']} />
                    <Legend />
                    <Bar dataKey="Aprobadas" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Compensadas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-3.5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 text-xs">Trabajos Registrados (Filtrados)</h3>
              <span className="text-gray-400 text-[11px]">Mostrando {registrosActuales.length} de {registros.length} registros</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white border-b text-gray-500">
                    <th className="p-3 whitespace-nowrap">Fecha / Horario Propuesto</th>
                    {isAdmin && <th className="p-3 whitespace-nowrap">Auditor</th>}
                    <th className="p-3">Actividad Propuesta</th>
                    <th className="p-3 whitespace-nowrap">Tiempo Total</th>
                    <th className="p-3 whitespace-nowrap">Estado</th>
                    <th className="p-3 text-center whitespace-nowrap">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {registrosActuales.length === 0 ? (<tr><td colSpan="6" className="p-4 text-center text-gray-500">No hay registros para este filtro</td></tr>) : registrosActuales.map(r => (
                    <tr key={r.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 whitespace-nowrap"><div className="font-medium text-gray-800">{r.fecha}</div><div className="text-[11px] text-gray-500">{r.hora_inicio && r.hora_termino ? `⏰ ${r.hora_inicio} a ${r.hora_termino}` : 'Sin horario'}</div></td>
                      {isAdmin && <td className="p-3 font-medium whitespace-nowrap">{r.auditor}</td>}
                      <td className="p-3 truncate max-w-xs">{r.actividad} {(Number(r.tiene_evidencia) > 0 || r.nombre_archivo_evidencia) && <Paperclip size={13} className="inline text-teal-700 ml-1" title="Posee enlace de evidencia" />}</td>
                      <td className="p-3 font-bold text-gray-700 whitespace-nowrap">{formatTime(r.horas_generadas_minutos)} hrs</td>
                      <td className="p-3 whitespace-nowrap">{renderBadgeEstado(r.estado)}</td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <button onClick={() => verDetallesRegistro(r.id)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition mr-1" title="Ver detalles"><Eye size={15} /></button>
                        <button onClick={() => abrirEdicion(r)} className="p-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition" title="Editar"><Edit size={15} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPaginas > 1 && (
              <div className="p-3 bg-gray-50 border-t flex justify-between items-center text-xs">
                <button onClick={() => setPaginaActual(p => Math.max(p - 1, 1))} disabled={paginaActual === 1} className="px-3 py-1 bg-white border rounded disabled:opacity-50 flex items-center gap-1"><ChevronLeft size={14}/> Anterior</button>
                <span>Página {paginaActual} de {totalPaginas}</span>
                <button onClick={() => setPaginaActual(p => Math.min(p + 1, totalPaginas))} disabled={paginaActual === totalPaginas} className="px-3 py-1 bg-white border rounded disabled:opacity-50 flex items-center gap-1">Siguiente <ChevronRight size={14}/></button>
              </div>
            )}
          </div>
        </div>
      );
    } else if (activeTab === 'registros') {
      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Gestión de Registros de Horas</h2>
            <button onClick={() => { setEditingId(null); setEditingEstado('Pendiente'); setFormData({ fecha: new Date().toISOString().split('T')[0], hora_inicio: '', hora_termino: '', motivo: 'Auditoría', actividad: '', departamento: user.departamento }); setIntervinientes([]); setNombreArchivoGuardado(null); setShowModal(true); }} className={`px-4 py-2 text-white font-bold rounded-lg shadow transition flex items-center gap-2 text-xs ${isAdmin ? 'bg-teal-700 hover:bg-teal-800' : 'bg-blue-600 hover:bg-blue-700'}`}><Plus size={16} /> Nuevo Registro</button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b text-gray-500">
                  <th className="p-3">Fecha</th>
                  {isAdmin && <th className="p-3">Auditor</th>}
                  <th className="p-3">Actividad</th>
                  <th className="p-3">Horario</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {registros.map(r => (
                  <tr key={r.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{r.fecha}</td>
                    {isAdmin && <td className="p-3 font-medium">{r.auditor}</td>}
                    <td className="p-3">{r.actividad}</td>
                    <td className="p-3">{r.hora_inicio} - {r.hora_termino}</td>
                    <td className="p-3 font-bold">{formatTime(r.horas_generadas_minutos)} hrs</td>
                    <td className="p-3">{renderBadgeEstado(r.estado)}</td>
                    <td className="p-3 text-center">
                      <button onClick={() => verDetallesRegistro(r.id)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg mr-1 hover:bg-blue-100"><Eye size={15}/></button>
                      <button onClick={() => abrirEdicion(r)} className="p-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"><Edit size={15}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    } else if (activeTab === 'compensaciones') {
      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Compensaciones de Horas</h2>
            {isAdmin && <button onClick={() => setShowModalComp(true)} className="px-4 py-2 bg-teal-700 text-white font-bold rounded-lg hover:bg-teal-800 transition flex items-center gap-2 text-xs"><Plus size={16}/> Registrar Compensación</button>}
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b text-gray-500">
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Auditor</th>
                  <th className="p-3">Horas Descontadas</th>
                  <th className="p-3">Motivo</th>
                  <th className="p-3">Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {compensaciones.length === 0 ? (<tr><td colSpan="5" className="p-4 text-center text-gray-500">No hay compensaciones registradas</td></tr>) : compensaciones.map(c => (
                  <tr key={c.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{c.fecha}</td>
                    <td className="p-3 font-medium">{c.auditor}</td>
                    <td className="p-3 font-bold text-blue-600">{formatTime(c.horas_compensadas_minutos)} hrs</td>
                    <td className="p-3">{c.motivo}</td>
                    <td className="p-3 text-gray-500">{c.observaciones || 'Sin observaciones'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    } else if (activeTab === 'auditores' && isAdmin) {
      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Gestión de Usuarios y Auditores</h2>
            <button onClick={abrirCreacionUsuario} className="px-4 py-2 bg-teal-700 text-white font-bold rounded-lg hover:bg-teal-800 transition flex items-center gap-2 text-xs"><UserPlus size={16}/> Nuevo Usuario</button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b text-gray-500">
                  <th className="p-3">Nombre</th>
                  <th className="p-3">Correo</th>
                  <th className="p-3">Cargo / Departamento</th>
                  <th className="p-3">Rol</th>
                  <th className="p-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuariosDB.map(u => (
                  <tr key={u.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-bold text-gray-800">{u.nombre}</td>
                    <td className="p-3 text-gray-600">{u.email}</td>
                    <td className="p-3">{u.cargo || u.departamento || 'General'}</td>
                    <td className="p-3">{renderBadgeRol(u.rol)}</td>
                    <td className="p-3 text-center">
                      <button onClick={() => abrirEdicionUsuario(u)} className="p-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"><Edit size={15}/></button>
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
    <div className="min-h-screen bg-gray-50 flex">
      <aside className={`w-64 ${themeBg} text-white flex flex-col justify-between hidden md:flex shadow-xl`}>
        <div>
          <div className="p-5 flex items-center gap-3 border-b border-white/10">
            <img src={LOGO_URL} alt="Logo" className="w-9 h-9 object-contain bg-white rounded-lg p-1" />
            <div><h1 className="font-bold text-sm leading-tight">CONTROL DE AUDITORÍAS</h1><p className="text-[10px] text-white/70">Remesas ASACh</p></div>
          </div>
          <nav className="p-3 space-y-1 text-xs">
            <button onClick={() => setActiveTab('dashboard')} className={menuClass('dashboard')}><LayoutDashboard size={16} /> Dashboard General</button>
            <button onClick={() => setActiveTab('registros')} className={menuClass('registros')}><Clock size={16} /> Registros de Horas</button>
            <button onClick={() => setActiveTab('compensaciones')} className={menuClass('compensaciones')}><FileText size={16} /> Compensaciones</button>
            {isAdmin && <button onClick={() => setActiveTab('auditores')} className={menuClass('auditores')}><Users size={16} /> Gestión de Auditores</button>}
          </nav>
        </div>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">{user.nombre ? user.nombre.charAt(0) : 'U'}</div>
            <div className="overflow-hidden"><p className="font-bold truncate text-xs">{user.nombre}</p><p className="text-[10px] text-white/70 truncate">{user.rol}</p></div>
          </div>
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 bg-red-600/80 hover:bg-red-600 text-white py-2 rounded-lg transition text-xs font-bold"><LogOut size={14} /> Cerrar Sesión</button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b h-16 flex items-center justify-between px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="font-bold text-gray-800 text-sm">Panel de Control</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)} className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition">
                <Bell size={20} />
                {solicitudesPendientes.length > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">{solicitudesPendientes.length}</span>}
              </button>
              {showNotificationsDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white border rounded-xl shadow-xl z-50 p-3 text-xs">
                  <p className="font-bold text-gray-800 pb-2 border-b mb-2">Notificaciones ({solicitudesPendientes.length})</p>
                  {solicitudesPendientes.length === 0 ? <p className="text-gray-400 text-center py-4">No hay notificaciones pendientes</p> : solicitudesPendientes.map((s, i) => (
                    <div key={i} className="p-2 hover:bg-gray-50 rounded border-b last:border-b-0">
                      <p className="font-medium text-gray-800">{isAdmin ? `Solicitud de ${s.auditor || 'Auditor'}` : 'Compensación Registrada'}</p>
                      <p className="text-[11px] text-gray-500">{s.actividad || s.motivo} - {s.fecha}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 border-l pl-4">
              <span className="text-xs font-bold text-gray-700 hidden sm:inline">{user.nombre}</span>
              {renderBadgeRol(user.rol)}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          {renderContent()}
        </main>
      </div>

      {/* MODAL DE DETALLE DE REGISTRO */}
      {registroDetalle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-sm text-gray-800">Detalle del Registro</h3>
              <button onClick={() => setRegistroDetalle(null)} className="text-gray-400 hover:text-gray-600 font-bold text-sm">✕</button>
            </div>
            <div className="space-y-2">
              <p><strong>Auditor:</strong> {registroDetalle.auditor}</p>
              <p><strong>Fecha:</strong> {registroDetalle.fecha}</p>
              <p><strong>Horario:</strong> {registroDetalle.hora_inicio} - {registroDetalle.hora_termino}</p>
              <p><strong>Tiempo Generado:</strong> {formatTime(registroDetalle.horas_generadas_minutos)} hrs</p>
              <p><strong>Actividad:</strong> {registroDetalle.actividad}</p>
              <p><strong>Estado Actual:</strong> {renderBadgeEstado(registroDetalle.estado)}</p>
              {registroDetalle.evidencias && registroDetalle.evidencias.length > 0 && (
                <div>
                  <strong>Evidencias en la Nube (GCS):</strong>
                  {registroDetalle.evidencias.map((ev, i) => (
                    <div key={i} className="mt-1">
                      <a href={ev.archivo_url} target="_blank" rel="noreferrer" className="text-blue-600 underline flex items-center gap-1 font-medium"><ExternalLink size={12}/> {ev.nombre_archivo || 'Ver archivo en Google Cloud'}</a>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {isAdmin && (
              <div className="flex gap-2 pt-4 border-t">
                <button onClick={() => cambiarEstado(registroDetalle.id, 'Ejecutado')} className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700 transition">Aprobar / Ejecutar</button>
                <button onClick={() => cambiarEstado(registroDetalle.id, 'Rechazado')} className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 transition">Rechazar</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR REGISTRO */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-sm text-gray-800">{editingId ? 'Editar Registro de Horas' : 'Nuevo Registro de Horas'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Fecha</label>
                  <input type="date" required value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} className="w-full border rounded-lg p-2 bg-gray-50 outline-none" />
                </div>
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Departamento</label>
                  <input type="text" value={formData.departamento} onChange={e => setFormData({...formData, departamento: e.target.value})} className="w-full border rounded-lg p-2 bg-gray-50 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Hora Inicio</label>
                  <input type="time" required value={formData.hora_inicio} onChange={e => setFormData({...formData, hora_inicio: e.target.value})} className="w-full border rounded-lg p-2 bg-gray-50 outline-none" />
                </div>
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Hora Término</label>
                  <input type="time" required value={formData.hora_termino} onChange={e => setFormData({...formData, hora_termino: e.target.value})} className="w-full border rounded-lg p-2 bg-gray-50 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-gray-600 font-medium mb-1">Actividad Realizada</label>
                <textarea required rows="3" value={formData.actividad} onChange={e => setFormData({...formData, actividad: e.target.value})} className="w-full border rounded-lg p-2 bg-gray-50 outline-none" placeholder="Describa la actividad..."></textarea>
              </div>

              {/* SECCIÓN DE SUBIDA DE EVIDENCIA CON GOOGLE CLOUD STORAGE */}
              <div className="p-3 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <label className="block font-bold text-gray-700 mb-1 flex items-center gap-1.5"><Upload size={14}/> Adjuntar Evidencia (Google Cloud Storage)</label>
                <input type="file" onChange={(e) => handleFileUpload(e, editingId)} className="w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                {nombreArchivoGuardado && <p className="text-[11px] text-green-600 font-medium mt-1">📎 Archivo vinculado: {nombreArchivoGuardado}</p>}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold hover:bg-gray-200 transition">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition">Guardar Registro</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR COMPENSACIÓN */}
      {showModalComp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-sm text-gray-800">Registrar Compensación de Horas</h3>
              <button onClick={() => setShowModalComp(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleCompSubmit} className="space-y-3">
              <div>
                <label className="block text-gray-600 font-medium mb-1">Seleccionar Auditor</label>
                <select required value={compData.usuario_id} onChange={e => setCompData({...compData, usuario_id: e.target.value})} className="w-full border rounded-lg p-2 bg-gray-50 outline-none">
                  <option value="">-- Seleccione --</option>
                  {usuariosDB.filter(u => u.rol !== 'Administrador').map(u => (
                    <option key={u.id} value={u.id}>{u.nombre} (Saldo disp: {formatTime(obtenerSaldoAuditorSeleccionado(u.id))})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Fecha</label>
                  <input type="date" required value={compData.fecha} onChange={e => setCompData({...compData, fecha: e.target.value})} className="w-full border rounded-lg p-2 bg-gray-50 outline-none" />
                </div>
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Horas (Ej: 02:30)</label>
                  <input type="text" required placeholder="HH:MM" value={compData.horas} onChange={e => setCompData({...compData, horas: e.target.value})} className="w-full border rounded-lg p-2 bg-gray-50 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-gray-600 font-medium mb-1">Motivo</label>
                <input type="text" value={compData.motivo} onChange={e => setCompData({...compData, motivo: e.target.value})} className="w-full border rounded-lg p-2 bg-gray-50 outline-none" />
              </div>
              <div>
                <label className="block text-gray-600 font-medium mb-1">Observaciones</label>
                <textarea rows="2" value={compData.observaciones} onChange={e => setCompData({...compData, observaciones: e.target.value})} className="w-full border rounded-lg p-2 bg-gray-50 outline-none"></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowModalComp(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-teal-700 text-white rounded-lg font-bold hover:bg-teal-800">Registrar y Notificar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR USUARIO */}
      {showModalUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-sm text-gray-800">{editingUserId ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button onClick={() => setShowModalUser(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            {userError && <div className="bg-red-50 text-red-600 p-2 rounded">{userError}</div>}
            <form onSubmit={handleUserSubmit} className="space-y-3">
              <div>
                <label className="block text-gray-600 font-medium mb-1">Nombre Completo</label>
                <input type="text" required value={userData.nombre} onChange={e => setUserData({...userData, nombre: e.target.value})} className="w-full border rounded-lg p-2 bg-gray-50 outline-none" />
              </div>
              <div>
                <label className="block text-gray-600 font-medium mb-1">Correo Electrónico</label>
                <input type="email" required value={userData.email} onChange={e => setUserData({...userData, email: e.target.value})} className="w-full border rounded-lg p-2 bg-gray-50 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Contraseña</label>
                  <input type="password" placeholder={editingUserId ? "Dejar en blanco para mantener" : "••••••••"} value={userData.password} onChange={e => setUserData({...userData, password: e.target.value})} className="w-full border rounded-lg p-2 bg-gray-50 outline-none" />
                </div>
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Confirmar</label>
                  <input type="password" placeholder="••••••••" value={userData.confirmPassword} onChange={e => setUserData({...userData, confirmPassword: e.target.value})} className="w-full border rounded-lg p-2 bg-gray-50 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Departamento</label>
                  <input type="text" value={userData.departamento} onChange={e => setUserData({...userData, departamento: e.target.value})} className="w-full border rounded-lg p-2 bg-gray-50 outline-none" />
                </div>
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Rol</label>
                  <select value={userData.rol} onChange={e => setUserData({...userData, rol: e.target.value})} className="w-full border rounded-lg p-2 bg-gray-50 outline-none">
                    <option value="Auditor">Auditor</option>
                    <option value="Analista">Analista</option>
                    <option value="Administrador">Administrador</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowModalUser(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-teal-700 text-white rounded-lg font-bold hover:bg-teal-800">Guardar Usuario</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const handleLogin = (userData) => setUser(userData);
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <HashRouter>
      <Routes>
        <Route path="*" element={!user ? <LoginScreen onLogin={handleLogin} /> : <DashboardApp user={user} onLogout={handleLogout} />} />
      </Routes>
    </HashRouter>
  );
}