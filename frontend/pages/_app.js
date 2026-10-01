import Head from "next/head";
import { AuthProvider } from "../lib/useAuth";
import ToastNotification from "../components/ToastNotification";
import "../styles/globals.css";

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Head>
        <title>Chili Monitor AI - Sistem Pemantauan Cabai Pintar</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta
          name="description"
          content="Sistem monitoring tanaman cabai berbasis kecerdasan buatan (CNN Multi-Head & LSTM) dan IoT telemetri."
        />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23059669%22 stroke-width=%222.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22M7 20h10%22/><path d=%22M12 20v-8%22/><path d=%22M12 12c0-4 3.5-7 7.5-7 0 4-3 7.5-7.5 7.5z%22/><path d=%22M12 15c0-3.5-3-6-6.5-6 0 3.5 2.5 6 6.5 6z%22/></svg>" />
      </Head>
      <Component {...pageProps} />
      <ToastNotification />
    </AuthProvider>
  );
}
