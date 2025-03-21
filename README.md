# Proyecto: Backend (microservicios) y Frontend

## Descripción del proyecto

Este es un proyecto creado para la evaluación de una prueba técnica. Es un proyecto que consiste en un backend con un api-gateway y tres microservicios. El api-gateway recibe las peticiones HTTP y las comunica por eventos a los microservicios. Los microservicios se comunican a través de RabbitMQ, el cual es el message broker. Para el servicio de cocina (kitchen-service) se implementó un sistema por colas o _queues_ que utiliza Redis para gestionar los mensajes o los jobs.

La aplicación es sencilla, recibe una petición HTTP para iniciar una orden en la recepción (reception), en la orden se selecciona una comida al azar y se envía a la cocina (kitchen) para su preparación. Luego la cocina solicita los ingredientes al microservicio de almacén (storage), y este se encarga de disponer de los ingredientes. En caso de no existir un ingrediente, los compra a través de un servicio externo (Farms Market). En caso de que al menos un ingrediente no se encuentre o no alcance para la preparación, la orden queda en estado pendiente y la preparación queda en estado pendiente.

La base de datos es PostgreSQL con ayuda de Supabase como servicio.

También hay un _Scheduler_ para ejecutar una tarea cada cierto tiempo a solicitud (intentar prodesar pedidos que hayan quedado pendientes).

Algunas cosas a tomar en cuenta: no existen archivos de migración de la base de datos por motivo de tiempo, por lo que la sincronización está activa (sync \= true). Inicialmente se pensó el sistema como sistema productivo real, en el cual una orden puede tener varias preparaciones y una preparación puede tener varios ingredientes lo cual sí aplica, sin embargo para las órdenes no, ya que la relación es uno a uno. Tomar en cuenta que la tabla de órdenes y la tabla de preparaciones son iguales, como se mencionó anteriormente, es uno a uno, y la idea es hacer el seguimiento de una preparación y de una orden por separado. No se realizaron conexiones entre tablas o se emplearon llaves foráneas (foreign keys) por temas de tiempo.

La selección de RabbitMQ y Redis es para implementar y demostrar varias cosas en el proyecto: el sistema de colas permite desacoplar los servicios, ya que si un servicio está caído, de todas maneras los mensajes quedan encolados hasta que éste regrese y los empiece a procesar nuevamente. Adicionalmente permite escalar horizontalmente, ya que podemos tener varias réplicas del mismo servicio y a través de un balanceador de cargas podemos manejar cada mensaje de la cola de forma paralela. Redis funciona de forma parecida: permite recibir los mensajes y los jobs para ir procesando cada uno separado o sin esperar que una orden sea completada para tener que recibir otra (aumenta la concurrencia e implementa un orden).

Hay otras decisiones en el proyecto que se tomaron en cuenta para sistemas productivos y otros a manera de Proof Of Concept para agilizar los tiempos o por motivos de tiempo, por lo que estoy dispuesto a resolver cualquier duda.

El api-getway posee los siguientes métodos:

- Health Check: `GET: /`
- Get Orders: `GET: /orders`
- Get Storage: `GET: /storage`
- Get Preparations: `GET: /preparations`
- Get Shopping History: `GET: /shopping_history`
- Get Meals: `GET: /meals`
- Create preparation: `POST: /create_preparation`
- Reset ingredients: `POST: /reset_ingredients`
- Reset orders and preparations: `POST: /reset_orders_and_preparations`

## Estructura del Proyecto

```
Proyecto
│
├── frontend
│   └── React.js + Material UI
│
└── backend-microservices
    ├── api-gateway (Node.js)
    ├── kitchen-service-nodejs (Node.js)
    ├── reception-service-nodejs (Node.js)
    └── storage-service-nodejs (Node.js)
```

---

## Instalación

### Clonar el repositorio

```bash
  git clone <url-del-repositorio>
  cd <nombre-del-repositorio>
```

### Instalación de dependencias

- **Backend:**

Por ahora la instalación es de cada

- **Frontend:**

```bash
cd ../frontend
npm install
```

---

## Ejecución con Docker

Para contenerizar cada microservicio se creó el `.Dockerfile` correspondiente a cada uno. Para ejecutarlos, se necesita cargar el documento `.env` de cada servicio para las variables de entorno. Para este caso, se pueden ejecutar los siguientes comandos:

### Construir o "build" de los contenedores:

```bash
docker build -t api-gateway-service ./backend-microservices/api-gateway
docker build -t kitchen-service ./backend-microservices/kitchen-service-nodejs
docker build -t reception-service ./backend-microservices/reception-service-nodejs
docker build -t storage-service ./backend-microservices/storage-service-nodejs
```

### Ejecutar cada microservicio de forma contenerizada:

```bash
docker run -d -p 3000:3000 --env-file .env api-gateway-service
docker run -d -p 3001:3001 --env-file .env kitchen-service
docker run -d -p 3002:3002 --env-file .env reception-service
docker run -d -p 3003:3003 --env-file .env storage-service
```

---

## Configuración de Entornos

### Variables de entorno

Crear un archivo `.env` en cada microservicio y en el frontend basado en el archivo `.env.example`.

---

## Levantar los Servicios

### Backend (API Gateway + Microservicios)

Desde cada carpeta dentro de `backend-microservices`, ejecutar:

```bash
npm run start:dev
```

### Frontend (React.js + Material UI)

Desde la carpeta `frontend`, ejecutar:

```bash
npm run dev
```

---

## Endpoints Principales

- **API Gateway:** `http://localhost:3000`
- **Frontend:** `http://localhost:5173`

---

## Tecnologías Utilizadas

- Backend: Node.js + Express + RabbitMQ + Redis + PostgreSQL (Supabase) + Scheduler o CronJob
- Frontend: React.js + Material UI

---

## Notas adicionales

- Asegúrate de tener RabbitMQ y Redis corriendo para la comunicación entre microservicios y messager broker respectivamente.
- La cola de procesamiento utiliza Bull con Redis.

---
