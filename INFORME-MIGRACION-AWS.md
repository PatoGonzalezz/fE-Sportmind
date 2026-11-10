# SportMind: revisión y preparación de la migración a AWS

Fecha de la revisión: 9 de noviembre de 2026. Este informe distingue los
cambios locales de los desplegados en AWS. Tras la autorización del usuario,
se aplicaron los cinco cambios indicados abajo en dev y se creó un usuario de
aplicación de prueba en Cognito.

## Cuenta y estado observado

«Cuenta AWS estándar» es una forma comprensible de distinguir una cuenta AWS
normal de un laboratorio de AWS Academy; no es necesario contratar un producto
llamado AWS Standard. El perfil local es la identidad que AWS CLI y Terraform
utilizan para administrar la cuenta. Los usuarios de Cognito, en cambio, son
usuarios de la aplicación.

| Elemento | Valor o situación confirmada |
| --- | --- |
| Cuenta | Cuenta AWS normal; identificadores detallados en el informe local |
| Región | `us-east-1` |
| Entorno existente | `dev` |
| API dev | URL terminada en `/dev`, obtenida de la salida de Terraform |
| User pool dev | Configurado en Cognito para el entorno dev |
| Cliente Cognito dev | Cliente de aplicación del user pool dev |
| Bucket del estado | Configurado con versionado habilitado |
| Estado Terraform | `env:/dev/sportmind/terraform.tfstate`; no se observó estado de `prod` en el bucket |
| Grupo `administrador` | El primer usuario de prueba completó su ingreso |
| Grupo `especialista` | Se creó una cuenta de prueba y el usuario confirmó que completó su primer ingreso |
| Endpoint de SageMaker | No existe `sportmind-dev-autorregulacion-endpoint` |

Estos identificadores y URL no son contraseñas. No se deben publicar claves de
acceso, tokens, contraseñas ni el contenido del state o de los planes binarios.
Las políticas IAM dev publicadas coinciden en contenido con los JSON locales;
en `SportMindAdmin` el orden de una declaración difiere, sin alterar su efecto.
Los marcadores de producción aún no corresponden a recursos reales. Se confirmó
que no es necesario conservar los datos del laboratorio de Academy. La carpeta
oficial `sportmind-terraform` no tenía historial Git; se inicializó un repositorio
local y se configuró el nombre inicial `feat/aws-standard-migration`, sin crear
commits. La rama de infraestructura será efectiva con el primer commit. Por eso
todos sus archivos fuente aparecen sin seguimiento y todavía no existe una base
anterior contra la cual Git pueda calcular el diff. Se excluyeron el estado,
los planes, las cachés y los ZIP. Este repositorio contiene solo el frontend;
la infraestructura se mantiene por separado.

## Correcciones realizadas y su motivo

Los cambios siguientes están en los archivos locales. Los cambios de Lambda,
IAM y CORS descritos en el plan fueron aplicados al entorno dev de AWS.

1. **Una sola configuración para la API.** El login tenía una URL fija del
   laboratorio, y otras pantallas usaban Function URLs antiguas. Se agregó
   `SPORTMIND_API_URL`, se preparó `.env.example` y el `.env` local ignorado por
   Git apunta a la etapa `/dev` de la API confirmada, para que el ambiente sea
   visible en la URL. Las rutas de Astro envían las peticiones a la URL
   configurada y mantienen sus estados HTTP. La URL se puede cambiar sin editar
   cada pantalla; este ajuste no determina la URL de producción.
2. **Autorización en las peticiones.** El backend actual requiere un ID token
   de Cognito para usuarios, métricas y logs, pero el frontend no lo enviaba.
   Ahora las llamadas protegidas agregan `Authorization: Bearer ...`; el proxy
   exige ese encabezado, no reenvía cookies y no sigue redirecciones hacia
   destinos ajenos. El login sigue siendo público. No se incorporan claves de
   AWS en el navegador ni en Electron.
3. **Sesiones y primer ingreso de Cognito.** La pantalla solo guardaba el ID
   token y no enviaba el `challengeUsername` del desafío de contraseña inicial.
   Ahora conserva también los tokens necesarios para cambiar contraseña y
   renovar la sesión, reintenta una petición tras una renovación válida y
   completa el desafío con el nombre enviado por Cognito. Al cerrar sesión se
   retiran los tres tokens locales. Se corrigió además la lectura Base64URL de
   los JWT en las pantallas que muestran datos del usuario. El formulario
   también admite explícitamente el nombre de usuario de la invitación. Las
   pantallas de ingreso, ajustes y creación de profesionales muestran ahora los
   requisitos de la contraseña.
4. **Cambio de contraseña.** Los formularios antiguos pedían un cambio con
   correo y contraseña nueva, petición que la Lambda rechaza por insegura. El
   formulario de acceso verifica la contraseña actual antes de cambiarla; la
   pantalla de ajustes utiliza el token de acceso y la contraseña anterior.
   Una pantalla duplicada que todavía usaba el flujo anterior redirige al
   login. La recuperación de contraseña olvidada por correo **no está
   implementada** y necesita un flujo específico.
5. **Métricas con bucket privado.** La pantalla intentaba leer directamente
   el bucket público `sportmind-datos`. Ahora consulta `GET /metricas` a través
   de la API autenticada. No se hacen públicos los buckets de la cuenta nueva.
6. **Vinculación y aislamiento de sesiones.** Antes la vinculación se guardaba
   solo en el navegador y la Lambda entregaba todas las sesiones a cualquier
   especialista autenticado. El frontend ahora solicita la vinculación a la API
   y el código local de la Lambda limita la lectura del especialista a las
   sesiones asignadas a su correo verificado; el administrador mantiene acceso
   a todas. Hay un filtro adicional de presentación en el frontend. La
   protección del servidor ya fue desplegada en dev mediante Terraform.
   Los códigos guardados solamente en un navegador antiguo deben vincularse de
   nuevo. La vinculación simultánea del mismo código requiere una mejora
   adicional de concurrencia antes de depender de ella en producción.
7. **Registros de actividad.** Antes se usaba una Function URL fija y no se
   enviaba el token. Los logs ahora usan `/api/logs`, conservan el respaldo
   local y detectan errores HTTP; el borrado local ya no se presenta como
   exitoso si AWS lo rechazó. El backend reserva lectura y borrado al grupo
   administrador.
8. **Usuarios y administradores.** El frontend y la Lambda identificaban a un
   administrador mediante un correo personal fijo. La Lambda local ahora
   consulta el grupo real `administrador` de Cognito, pagina los resultados de
   Cognito y DynamoDB y devuelve errores reales si falla una consulta. Se agregó
   el permiso IAM mínimo `cognito-idp:ListUsersInGroup` al rol de esa Lambda y
   se amplió su timeout de 3 a 15 segundos. La interfaz usa el rol recibido.
9. **Edición inexistente de usuarios.** El endpoint antiguo respondía éxito
   sin guardar cambios. Ahora responde `501` y explica que la operación aún no
   está implementada. La creación de entrenadores sí se dirige a la ruta real
   y envía el token del administrador.
10. **Retiro de acceso directo a Cognito.** Se eliminó un servicio de frontend
    sin uso que construía un cliente administrativo con variables de claves de
    AWS. La administración de usuarios corresponde a la API y sus roles IAM.
11. **Configuración Terraform e IAM.** Se estableció el perfil confirmado
    `sportmind-admin`, se sustituyeron los marcadores dev de API y user pool en
    las políticas locales y se añadió `http://localhost:4321` a las URL de dev,
    conservando `http://localhost:3000`. Los permisos de otros proyectos y los
    marcadores de prod no se ampliaron. Se excluyen de Git los planes y estados.
12. **Build, documentación y pruebas.** La variable de GitHub Actions cambió de
    `COGNITO_API_URL` a `SPORTMIND_API_URL`. Se agregaron instrucciones de uso y
    pruebas de proxy, renovación de sesión, aislamiento de métricas y grupo de
    administradores. Se corrigió una referencia rota entre README de IAM y
    Terraform.
13. **Carga de evaluaciones en desarrollo.** Tras empaquetar Electron mientras
    Astro estaba ejecutándose, la dependencia optimizada de Chart.js quedó
    desactualizada y la página permanecía en «Conectando». Se regeneró la
    caché al reiniciar con `npx astro dev --background --force` y se excluyó
    `release/` del observador de Vite para evitar que vigile los artefactos de
    Electron y encuentre archivos bloqueados. Durante la prueba del especialista
    volvió a observarse el error `504 Outdated Optimize Dep` para Chart.js; se
    reinició nuevamente el servidor con `--force` y el panel cargó el estado
    vacío correcto. Si vuelve a ocurrir, reinicia el servidor con `--force`
    después de detenerlo; esta medida no garantiza que el problema no reaparezca.
14. **Etapa dev explícita en la URL.** Antes, el frontend usaba la etapa
    `$default` de la API dev, sin un indicativo en la dirección. Por solicitud
    del equipo, la configuración local y su ejemplo usan ahora la etapa `/dev`;
    esta etapa conecta con los mismos recursos dev y no modifica la definición
    de producción. Para un build de dev en GitHub Actions, la variable del
    repositorio `SPORTMIND_API_URL` también debe tener la URL terminada en
    `/dev`; cambiar el archivo local no modifica esa variable remota.
15. **Pruebas de API con Postman.** Se documentó el flujo real de autenticación,
    creación, consulta y vinculación de sesiones y se preparó una colección
    dev en `../sportmind-terraform/postman`. Los ejemplos son
    ficticios y no incluyen contraseñas ni tokens. La API actual no valida el
    esquema de métricas y no tiene una ruta para borrar sesiones; se detallan
    estas limitaciones. Se acordó usar puntajes de tiro de 0 a 100 para las
    pruebas; la escala emitida por VR puede verificarse cuando esté disponible
    su código. La colección se validó con el esquema oficial de Postman y sus
    dos ejemplos se comprobaron contra la Lambda simulada, sin crear
    evaluaciones en AWS.
16. **Especialista de prueba.** A solicitud del usuario, se creó una cuenta
    en Cognito mediante AWS CLI, se marcó su correo autorizado como verificado,
    se asignó el grupo `especialista` y se agregó el registro correspondiente
    en DynamoDB dev. Cognito recibió la instrucción de enviar una invitación
    con contraseña temporal y el usuario confirmó que la recibió y completó
    el primer ingreso. Cognito devolvió `CONFIRMED` y habilitado. Esta creación
    no verificó la ruta de registro de la API.
17. **Mensaje de vinculación.** Se corrigió el texto de la ventana que pedía el
    código de sesión: todavía afirmaba que la vinculación era local, pero la
    implementación actual llama a la API y asigna la sesión a la cuenta del
    especialista. El mensaje ahora describe ese comportamiento y se comprobó
    en la pantalla del especialista.
18. **Estructura de la colección Postman.** Se reorganizaron las solicitudes en
    una secuencia, siguiendo la colección VR entregada como referencia, y se
    trasladaron las variables de configuración y códigos a la propia colección.
    Los scripts leen y actualizan esas variables sin requerir un entorno aparte;
    por solicitud del usuario, los tokens también son visibles en la colección.
    Las contraseñas se introducen como valores locales en Postman y el archivo
    se entrega con contraseñas y tokens vacíos. Los tokens anteriores se limpian
    al iniciar una nueva sesión para evitar reutilizarlos tras un fallo. Se
    comprobó de forma simulada el inicio de sesión, el desafío de Cognito, el
    código de seis dígitos y la vinculación, además del bloqueo cuando otro
    entorno sobrescribe la URL dev o los tokens. La referencia contiene
    rutas y campos que no figuran en la infraestructura y el frontend actuales;
    las diferencias se detallan en la guía y no se modificó AWS por este cambio.

## Plan de Terraform aplicado

El plan revisado y autorizado indicó **0 recursos nuevos, 5 actualizaciones y
0 eliminaciones**, y se aplicó en dev con ese resultado:

1. Agregar `http://localhost:4321` al CORS de API Gateway y conservar el origen
   anterior en el puerto 3000.
2. Agregar esa misma URL a los callbacks del cliente Cognito, conservando la
   anterior.
3. Actualizar el código de la Lambda de métricas para limitar la lectura por
   especialista.
4. Actualizar la Lambda que lista usuarios para reconocer administradores por
   grupo y paginar los resultados.
5. Agregar `cognito-idp:ListUsersInGroup` a la política del rol de esa Lambda.

Después del apply, un nuevo `terraform plan` confirmó que no había diferencias
con la configuración local. Los planes futuros deben generarse y revisarse de
nuevo; pueden contener información sensible y están excluidos de Git. No uses
el antiguo archivo `tfplan` que ya estaba en la carpeta: podría estar obsoleto.

## Cómo ejecutar y probar

En el computador revisado están instalados Node 26.12.1, npm 12.0.2, Terraform
1.15.6, Python 3.14.5 y AWS CLI 1.45.36. El proyecto requiere Node 22.12 o
superior y Terraform 1.10 o superior. Se recomienda AWS CLI v2; en este equipo
el acceso con el módulo `python -m awscli` funcionó aun cuando `aws.cmd` mostró
un problema de asociación de archivos `.py`.

Desde PowerShell:

```powershell
Set-Location -LiteralPath 'C:\ruta\al\fE-Sportmind'
npm ci
# Ya existe un .env local para dev. En otro computador:
# Copy-Item .env.example .env
# y ajustar SPORTMIND_API_URL con terraform output -raw api_stage_url en dev.
npx astro dev --background
npx astro dev status
```

Abre `http://localhost:4321`. Usa `npx astro dev logs` para el registro y
`npx astro dev stop` para detener el servidor. `npm run electron:preview` prueba
Electron sin publicar. Evita `npm run dist` y `npm run electron:build` para
pruebas: están configurados para publicar releases. Los comandos `api` y
`dev:all` apuntan a `src.services.api`, que no existe en este repositorio.

Con autorización del usuario se creó un administrador de prueba en el user
pool dev, se marcó su correo autorizado como verificado y se asignó al grupo
`administrador`. El usuario confirmó que recibió la invitación y llegó a la
pantalla para establecer una contraseña nueva. La cuenta quedó inicialmente en
`FORCE_CHANGE_PASSWORD` hasta completar el primer ingreso. La contraseña temporal
no debe enviarse en este chat. La política vigente exige al menos 8 caracteres,
una mayúscula, una minúscula, un número y un símbolo; la contraseña temporal
vence a los 7 días. Con el usuario se puede probar: ingreso y cambio inicial de contraseña,
creación de un especialista, listado, escritura/lectura de sesiones asignadas,
separación entre especialistas y logs. Se necesitan datos sintéticos para las
pruebas; la conexión VR requiere su repositorio y será una etapa posterior.

## Qué se verificó

- `npm run build` compiló el frontend; `npm test` aprobó 2 pruebas. Se verificó
  también que la variable de CI se incorpora al build.
- `terraform fmt -check -recursive` y `terraform validate` aprobaron;
  `terraform test` aprobó 9 pruebas con AWS simulado.
- Las pruebas locales de handlers JavaScript aprobaron 11 casos, las de
  seguridad Python 8 y las de políticas IAM 13.
- Se instaló Electron 44.4.4 y el script local que prepara Astro terminó bien.
  `electron:dir` falló al renombrar un directorio temporal de Windows con
  `EPERM`; la causa concreta de ese bloqueo no está confirmada. Un segundo
  empaquetado, usando la distribución local ya instalada mediante
  `npx electron-builder --dir --config.electronDist=node_modules/electron/dist`,
  terminó correctamente. Aún no se ha completado una prueba interactiva de
  la aplicación de escritorio.
- El servidor local respondió `200` en `/login` y `401` en `/api/metricas` sin
  token. El login local envió una petición vacía a la API dev y recibió `400`,
  la respuesta esperada por falta de credenciales. La API AWS devolvió `401`
  para `GET /metricas` sin token. Estas solicitudes pueden generar registros
  operacionales en AWS.
- El apply terminó con 0 recursos agregados, 5 modificados y 0 eliminados; un
  plan posterior no encontró cambios. La Lambda de usuarios quedó activa con
  actualización exitosa. El usuario completó su primer ingreso; se comprobó la
  lectura autenticada de métricas vacías, el listado de su cuenta como
  administrador y la lectura del registro de inicio de sesión. Falta probar la
  creación de especialistas, la asignación entre cuentas y el dispositivo VR.

## Pendientes y límites para producción

- Producción no está desplegada en el estado revisado. Hay que definir URL de
  aplicación y callbacks reales, actualizar los IDs de prod de las políticas,
  sus variables de despliegue y la variable de GitHub Actions para cada build.
  Las políticas administradas se actualizan en IAM; editar un JSON local no las
  publica. Las restricciones del perfil actual pueden requerir otro
  administrador IAM para actualizar versiones de esas políticas.
- La Lambda `/inferencia` espera un endpoint de SageMaker que actualmente no
  existe y Terraform no lo crea. La aplicación también trae modelos ONNX que
  ejecuta localmente: el uso de esos modelos no demuestra que SageMaker esté
  funcionando. Crear un endpoint o notebook puede generar costos continuos.
- Revisar cuotas y costos de la cuenta, presupuestos, retención y respaldo,
  permisos reales y necesidad de MFA antes de producción. Cognito utiliza su
  configuración de correo predeterminada, con cuota diaria; SES requiere su
  propia configuración si se necesita mayor volumen.
- Los tokens todavía se guardan en `localStorage`; conviene revisar amenazas
  de XSS y una estrategia de sesión más robusta antes de usar datos sensibles.
  El listado de sesiones lee objetos S3 y puede necesitar rediseño para grandes
  volúmenes; también falta proteger contra vínculos simultáneos del mismo código.
- El cliente VR no está en este workspace. Debe adaptarse para autenticarse en
  Cognito y enviar un JWT a `POST /vr-metricas`; sus URL y formato actuales no
  se pudieron comprobar.

Referencias: [backend S3 y bloqueo de Terraform](https://developer.hashicorp.com/terraform/language/backend/s3),
[prácticas de identidad de AWS](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html),
[runtimes de Lambda](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html),
[correo de Cognito](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-email.html).
