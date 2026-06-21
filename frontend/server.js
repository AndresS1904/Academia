// Adaptador requerido por el Node.js App Manager de Dongee (cPanel/LiteSpeed):
// ese panel necesita un archivo .js literal que escuche en process.env.PORT.
// "next start" es un comando de CLI, no un módulo invocable directamente,
// así que se usa la API programática de Next para lograr el mismo resultado.
const next = require("next");
const http = require("http");

const app = next({ dev: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  http
    .createServer((req, res) => handle(req, res))
    .listen(process.env.PORT || 3000, () => {
      console.log(`Frontend listo en el puerto ${process.env.PORT || 3000}`);
    });
});
