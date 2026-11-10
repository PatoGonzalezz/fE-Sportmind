# 🎓 Proyecto SportMind 

Welcome al repositorio oficial de nuestro **Proyecto final**. En este espacio recopilamos el código principal correspondiente al desarrollo de la aplicación SportMind VR.

---

## 👥 Integrantes del Equipo

* **Patricio González**
* **Matías Díaz**
* **Francisco Bilbao**

---

## 🚀 Estado del Proyecto
  ## **FASE 2 - Fase de Implementación**

> ⚠️ **Nota:** Repositorio en constante actualización conforme al avance de las entregas académicas.

## Ejecutar el frontend en desarrollo

Se necesita Node.js 22.12 o superior y npm. Desde esta carpeta:

```powershell
npm ci
Copy-Item .env.example .env
```

Edita `.env` y define `SPORTMIND_API_URL` con la salida `api_stage_url` de
Terraform para dev. La URL de ese entorno termina en `/dev`. No agregues
claves de AWS al frontend ni a `.env`.

```powershell
npx astro dev --background
npx astro dev status
```

Abre <http://localhost:4321>. Para detener el servidor, ejecuta
`npx astro dev stop`. Para comprobar los cambios localmente ejecuta `npm test`
y `npm run build`. El frontend puede compilarse sin usuario de Cognito, pero
para probar el ingreso y las rutas protegidas se necesita un usuario de
aplicación en el grupo correspondiente.

Para probar Electron sin publicar un instalador, usa `npm run electron:preview`.
Los comandos `api` y `dev:all` mencionan un servidor Python que no está incluido
en este repositorio. `dist` y `electron:build` publican releases; no son
necesarios para el desarrollo local. En GitHub Actions se debe configurar la
variable `SPORTMIND_API_URL` con el ambiente que corresponda antes de generar
una versión. La URL se incorpora al build y también puede reemplazarse mediante
la variable de entorno del proceso servidor.

Consulta `INFORME-MIGRACION-AWS.md` para conocer las comprobaciones, los
cambios pendientes en AWS y las limitaciones detectadas.

Si también tienes la carpeta local `sportmind-terraform`, consulta su guía
`postman/GUIA-POSTMAN.md` para crear evaluaciones ficticias. Esa carpeta de
infraestructura se mantiene por separado de este repositorio.

