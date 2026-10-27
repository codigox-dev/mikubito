import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
  title: {
    default: "Cubito · Nuestro hogar",
    template: "%s · Cubito",
  },
  description:
    "Tareas, finanzas, viajes y compras de casa. Un pequeño espacio para organizarnos mejor.",
  applicationName: "Cubito",
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbfaf7",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
