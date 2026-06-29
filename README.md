# Sistema de Gestión Financiera Personal - Documentación Completa

## 📋 Resumen del Proyecto

Aplicación web para gestión financiera personal que permite registrar ingresos, egresos, deudas, metas de ahorro y transacciones recurrentes con visualización en calendario.

### Stack Tecnológico

- **Frontend**: React.js 18+ con TypeScript y Material-UI
- **Backend**: ASP.NET Core 8.0 Web API
- **Base de Datos**: SQL Server o PostgreSQL
- **ORM**: Entity Framework Core 8.0
- **Autenticación**: JWT (JSON Web Tokens)
- **Containerización**: Docker

---

## 📁 Archivos de Documentación

### 1. **DATABASE_MODEL.md**
- Diagrama entidad-relación completo
- Scripts SQL para creación de tablas
- Modelos de Entity Framework Core
- Configuración del DbContext

### 2. **ARCHITECTURE.md**
- Estructura completa del proyecto (frontend + backend)
- Endpoints de API REST
- Ejemplos de Controllers y Services
- Configuración de Program.cs
- Docker Compose

### 3. **IMPLEMENTATION_GUIDE.md**
- Pasos de configuración inicial del backend
- DTOs (Data Transfer Objects)
- AutoMapper profiles
- Repository Pattern
- AuthService con JWT
- Comandos útiles (migrations, docker, etc.)
- Testing
- Deployment

### 4. **FRONTEND_API_INTEGRATION.md**
- Configuración de Axios con interceptores
- Context de autenticación
- Servicios API para cada entidad
- Custom Hooks con React Query
- Componentes de autenticación
- Integración completa del frontend

---

## 🚀 Roadmap de Implementación

### Fase 1: Setup del Backend (Semana 1-2)

#### Día 1-2: Configuración inicial
- [ ] Crear solución y proyectos de .NET
- [ ] Instalar paquetes NuGet necesarios
- [ ] Configurar estructura de carpetas
- [ ] Configurar appsettings.json
- [ ] Setup de Docker para SQL Server

#### Día 3-4: Modelos y Base de Datos
- [ ] Crear modelos de entidades
- [ ] Configurar DbContext
- [ ] Crear primera migración
- [ ] Aplicar migración a base de datos
- [ ] Verificar tablas creadas

#### Día 5-7: Autenticación
- [ ] Implementar registro de usuarios
- [ ] Implementar login con JWT
- [ ] Configurar middleware de autenticación
- [ ] Probar endpoints con Postman/Swagger

#### Día 8-10: Endpoints de Transacciones
- [ ] Crear TransactionService
- [ ] Crear TransactionController
- [ ] Implementar CRUD completo
- [ ] Agregar endpoint de estadísticas
- [ ] Testing

#### Día 11-14: Resto de Endpoints
- [ ] RecurringTransactions CRUD
- [ ] Debts CRUD
- [ ] SavingsGoals CRUD
- [ ] FixedExpenses CRUD
- [ ] Calendar endpoint
- [ ] Testing integral

---

### Fase 2: Frontend con Backend (Semana 3-4)

#### Día 1-3: Configuración React
- [ ] Crear proyecto React con TypeScript
- [ ] Instalar dependencias (React Query, Axios, MUI)
- [ ] Configurar Axios con interceptores
- [ ] Crear AuthContext
- [ ] Implementar páginas de Login/Register

#### Día 4-6: Migrar Componentes
- [ ] Crear servicios API
- [ ] Crear custom hooks con React Query
- [ ] Migrar Dashboard para consumir API
- [ ] Migrar TransactionForm para consumir API
- [ ] Implementar manejo de errores

#### Día 7-10: Resto de Componentes
- [ ] Migrar Calendar con datos del backend
- [ ] Migrar SavingsJar
- [ ] Migrar DebtTracker
- [ ] Migrar Statistics
- [ ] RecurringTransactions integrado

#### Día 11-14: Testing y Refinamiento
- [ ] Testing end-to-end
- [ ] Corrección de bugs
- [ ] Optimización de rendimiento
- [ ] UX improvements
- [ ] Migración de datos de localStorage

---

### Fase 3: Deployment (Semana 5)

#### Backend
- [ ] Configurar Azure App Service o AWS
- [ ] Configurar base de datos en la nube
- [ ] Deploy del backend
- [ ] Configurar CORS
- [ ] Setup de CI/CD con GitHub Actions

#### Frontend
- [ ] Build de producción
- [ ] Deploy en Vercel/Netlify
- [ ] Configurar variables de entorno
- [ ] Testing en producción

#### Monitoreo
- [ ] Configurar Application Insights
- [ ] Setup de logs
- [ ] Monitoreo de errores

---

## 🔧 Comandos Rápidos

### Backend

```bash
# Crear proyectos
dotnet new sln -n FinancialApp
dotnet new webapi -n FinancialApp.API
dotnet new classlib -n FinancialApp.Core
dotnet new classlib -n FinancialApp.Infrastructure

# Migraciones
dotnet ef migrations add InitialCreate --project FinancialApp.Infrastructure --startup-project FinancialApp.API
dotnet ef database update --project FinancialApp.Infrastructure --startup-project FinancialApp.API

# Ejecutar
dotnet run --project FinancialApp.API
```

### Frontend

```bash
# Crear proyecto
npx create-react-app financial-app --template typescript

# Instalar dependencias
npm install @mui/material @emotion/react @emotion/styled
npm install axios @tanstack/react-query react-router-dom
npm install date-fns sonner

# Ejecutar
npm start
```

### Docker

```bash
# Iniciar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener
docker-compose down
```

---

## 📊 Entidades Principales

### 1. **Users** (Usuarios)
- Autenticación y autorización
- Datos personales

### 2. **Transactions** (Transacciones)
- Ingresos y egresos únicos
- Categorías y métodos de pago

### 3. **RecurringTransactions** (Transacciones Recurrentes)
- Ingresos/egresos que se repiten
- Patrón semanal o mensual

### 4. **Debts** (Deudas)
- Registro de deudas
- Seguimiento de pagos

### 5. **SavingsGoals** (Metas de Ahorro)
- Objetivos de ahorro
- Progreso actual

### 6. **FixedExpenses** (Gastos Fijos)
- Gastos mensuales fijos
- Cálculo de ahorro diario necesario

---

## 🔐 Seguridad

### Backend
- ✅ Autenticación JWT
- ✅ Hash de contraseñas con BCrypt
- ✅ Validación de UserId en cada request
- ✅ HTTPS en producción
- ✅ CORS configurado
- ✅ Validación de entrada con FluentValidation

### Frontend
- ✅ Token almacenado de forma segura
- ✅ Interceptores para agregar token automáticamente
- ✅ Redirección al login si el token expira
- ✅ Variables de entorno para URLs

---

## 📈 Mejoras Futuras

### Corto Plazo
- [ ] Edición de transacciones
- [ ] Balance por método de pago
- [ ] Filtros avanzados
- [ ] Exportar a CSV/Excel
- [ ] Modo oscuro

### Mediano Plazo
- [ ] Presupuestos mensuales
- [ ] Notificaciones push
- [ ] Múltiples metas de ahorro
- [ ] Comparativa mes a mes
- [ ] Proyección financiera

### Largo Plazo
- [ ] Aplicación móvil (React Native)
- [ ] Integración con bancos
- [ ] Dashboard compartido (familia)
- [ ] Asesor financiero IA
- [ ] Reportes automáticos

---

## 🐛 Debugging

### Problemas Comunes

**Error: Cannot connect to SQL Server**
```bash
# Verificar que SQL Server esté corriendo
docker ps

# Reiniciar contenedor
docker-compose restart sqlserver
```

**Error: 401 Unauthorized**
```bash
# Verificar token en localStorage
console.log(localStorage.getItem('token'))

# Verificar configuración de JWT en appsettings.json
```

**Error: CORS policy**
```csharp
// Verificar configuración de CORS en Program.cs
app.UseCors("AllowReactApp");
```

---

## 📞 Contacto y Soporte

Para dudas o problemas durante el desarrollo:
1. Revisar la documentación completa
2. Verificar logs del backend y frontend
3. Consultar la sección de debugging
4. Revisar ejemplos de código en los archivos MD

---

## 📝 Checklist de Desarrollo

### Backend ✅
- [ ] Modelos de datos creados
- [ ] DbContext configurado
- [ ] Migraciones aplicadas
- [ ] AuthService implementado
- [ ] Controllers creados
- [ ] Services implementados
- [ ] Repository Pattern aplicado
- [ ] Validaciones agregadas
- [ ] Testing básico
- [ ] Swagger configurado

### Frontend ✅
- [ ] Proyecto React configurado
- [ ] AuthContext implementado
- [ ] Axios configurado
- [ ] Servicios API creados
- [ ] Custom hooks con React Query
- [ ] Login/Register implementados
- [ ] Dashboard migrado
- [ ] Transacciones migradas
- [ ] Calendar migrado
- [ ] Savings migrado
- [ ] Debts migrado
- [ ] Statistics migrado

### DevOps ✅
- [ ] Docker configurado
- [ ] CI/CD configurado
- [ ] Variables de entorno
- [ ] Deploy en desarrollo
- [ ] Deploy en producción
- [ ] Monitoreo configurado

---

## 🎯 Objetivos del Proyecto

1. ✅ **Control financiero completo**: Registro detallado de todas las transacciones
2. ✅ **Visualización clara**: Dashboards y gráficos intuitivos
3. ✅ **Planificación**: Calendario de ingresos y egresos recurrentes
4. ✅ **Ahorro inteligente**: Cálculo automático de ahorro diario necesario
5. ✅ **Multi-dispositivo**: Acceso desde cualquier lugar con autenticación
6. ✅ **Escalable**: Arquitectura preparada para crecer

---

## 📚 Recursos Adicionales

### Documentación Oficial
- [ASP.NET Core](https://docs.microsoft.com/aspnet/core)
- [Entity Framework Core](https://docs.microsoft.com/ef/core)
- [React](https://react.dev)
- [Material-UI](https://mui.com)
- [React Query](https://tanstack.com/query)

### Tutoriales Recomendados
- [JWT Authentication in ASP.NET Core](https://www.youtube.com/watch?v=M6AkbBaDGJE)
- [React Query Tutorial](https://www.youtube.com/watch?v=r8Dg0KVnfMA)
- [Entity Framework Core Tutorial](https://www.youtube.com/watch?v=SryQxUeChMc)

---

## ✨ Conclusión

Esta documentación completa te proporciona todo lo necesario para desarrollar una aplicación de gestión financiera profesional con React.js, C# y SQL Server. Sigue el roadmap paso a paso y tendrás tu aplicación lista en aproximadamente 5 semanas.

¡Buena suerte con el desarrollo! 🚀
