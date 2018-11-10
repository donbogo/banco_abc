# Banco abc - Pago servicios
---
##### Facultad de Ingeniería | Departamento de ingeniería de sistemas
Especialización en arquitectura empresarial de software
___
## Introducción
Esta solución tiene la finalidad la implementación de una arquitectura orientada a servicios, donde se pueda observar una aproximación de un caso de negocio real.
## Enunciado
El Banco ABC está realizando varios proyectos de actualización tecnológica los cuales le permiten ofrecer sus productos financieros de manera más ágil y de ésta manera respondera nuevas necesidades del mercado. El Banco acaba de firmar una alianza estratégica con diferentes proveedores de servicios públicos (Agua, Gas, Luz, Telefonía) o también llamados convenios, para permitir a los clientes del banco a través de los diferentes canales de servicio (Cajeros Automáticos, Cajero de Oficina, Teléfono, Portal Web, Aplicación Móvil) permitir el pago de los mismos.  
## Solución
La solución planteada esta basada en un Estilo orientado a servicios, representan cada una de las funcionalidades acordadas en los convenios con los proveedores, consulta saldo a pagar, pago de servicio y compensación de pago. Se implementan un conjunto de servicios con las necesidades internas de negocio lo cual permite desacoplar los servicios de los proveedores y así no depender de sus detalles. Manejador de eventos con coreografia a traves de un patrón publish and suscriber.
### Servicios

  - (Enrutador) Router
  - (Despachador/Traductor) Broker
### Propuesta arquitectónica
Implementación patrón nuclear publish and suscriber para coreografía de eventos/mensajes que se gestiónan a través de Apache KAFKA. Los tópicos que manejará Kafka son:
>>Router: 
>>
>>Response:
>>
>>Broker:
>>

## Instalación



