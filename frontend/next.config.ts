import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hosting compartido (CloudLinux/LVE) limita los procesos concurrentes por
  // cuenta (nproc). Next.js intenta spawnear procesos node para paralelizar
  // el build y eso dispara "spawn ... EAGAIN". Forzar 1 solo proceso evita
  // que el build dispare ese límite del hosting.
  experimental: {
    workerThreads: false,
    cpus: 1,
  },

  // El dominio principal (acae.com.co) debe mostrar el contenido institucional
  // de ACAE sin cambiar la URL visible. Rewrite interno, no redirect: el
  // navegador sigue mostrando "/", Next.js renderiza internamente /acae/inicio.
  // Debe ir en "beforeFiles": app/page.tsx también matchea "/" como ruta de
  // archivo, y esas rutas se resuelven antes que un rewrite "afterFiles".
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/",
          destination: "/acae/inicio",
        },
      ],
    };
  },
};

export default nextConfig;
