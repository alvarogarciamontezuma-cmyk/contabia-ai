# CONTABIA AI — Instrucciones maestras

## 1. Identidad del proyecto
CONTABIA AI es una plataforma modular de contabilidad, finanzas y administración empresarial. Comienza en Panamá y podrá expandirse internacionalmente.

Debe ser un producto real, seguro, mantenible y escalable; no una simple maqueta.

## 2. Reglas de desarrollo
- Trabajar por fases pequeñas y verificables.
- No desarrollar todo el sistema de una sola vez.
- No inventar reglas contables, fiscales, laborales ni legales.
- Utilizar datos ficticios durante el desarrollo.
- No afirmar que una función funciona sin probarla.
- Documentar decisiones, errores y limitaciones.
- Solicitar aprobación antes de avanzar de fase.

## 3. Arquitectura propuesta
- TypeScript.
- React y Next.js.
- PostgreSQL cuando el equipo esté preparado.
- Python opcional para OCR y procesamiento documental.
- Git para control de versiones.
- Arquitectura modular, inicialmente sin microservicios.

## 4. Motor contable
- Aplicar contabilidad de partida doble.
- Los débitos deben ser iguales a los créditos.
- Mantener trazabilidad de los asientos.
- Utilizar reversiones documentadas.
- Permitir bloquear períodos contables.
- No modificar silenciosamente asientos confirmados.
- Crear pruebas automatizadas para las operaciones financieras.

## 5. Seguridad y privacidad
- Separar los datos de cada empresa.
- Aplicar permisos en servidor y base de datos.
- Denegar accesos por defecto.
- Registrar operaciones sensibles.
- Proteger contraseñas y sesiones.
- No guardar secretos en el código.
- No crear accesos ocultos ni cuentas maestras.
- No mostrar información financiera privada de clientes al administrador de la plataforma.

## 6. Inteligencia artificial
La IA podrá extraer datos de documentos, sugerir clasificaciones, proponer asientos y detectar posibles duplicados.

Toda sugerencia deberá validarse antes de registrar operaciones contables.

El motor contable debe funcionar aunque la IA esté desactivada.

No enviar documentos privados a servicios externos de IA sin autorización.

## 7. Panamá
Panamá será el primer país.
Las reglas de ITBMS, impuestos, planilla y legislación laboral deben verificarse con fuentes oficiales y profesionales competentes.

No considerar definitivos los cálculos legales o fiscales sin validación.

## 8. Forma de trabajo
Antes de cada fase:
1. Explicar el objetivo.
2. Revisar requisitos.
3. Proponer un plan.
4. Identificar riesgos.
5. Implementar en pasos pequeños.
6. Ejecutar pruebas.
7. Corregir errores.
8. Documentar resultados.
9. Explicar cómo verificar.
10. Solicitar autorización para continuar.

## 9. Equipo disponible
- Windows 10 de 64 bits.
- AMD A9-9425.
- 4 GB de RAM.
- SSD.

Priorizar herramientas ligeras y considerar servicios en la nube cuando sea necesario.

## 10. Primera tarea
No generar todavía el sistema completo.

Primero inspeccionar el entorno de desarrollo, revisar estas instrucciones y preparar el diseño técnico inicial de CONTABIA AI.

Explicar las decisiones antes de ejecutar cambios importantes.