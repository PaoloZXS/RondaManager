export default function ApkPage() {
  return (
    <div>
      <h1>Guida Installazione APK</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>
        L'APK dell'app mobile viene trasferito via cavo USB e installato
        manualmente sul telefono. Segui la procedura qui sotto.
      </p>

      <div className="card" style={{ maxWidth: 700 }}>
        <h3>1. Genera l'APK</h3>
        <p style={{ color: '#666', marginBottom: 16 }}>
          Apri un terminale nella cartella <code>mobile/</code> del progetto ed esegui:
        </p>
        <pre
          style={{
            background: '#f5f5f5',
            padding: 16,
            borderRadius: 8,
            overflowX: 'auto',
            fontSize: 14,
          }}
        >
{`cd mobile
flutter build apk --split-per-abi`}
        </pre>
      </div>

      <div className="card" style={{ maxWidth: 700, marginTop: 24 }}>
        <h3>2. Trova l'APK generato</h3>
        <p style={{ color: '#666', marginBottom: 16 }}>
          Dopo la build, l'APK si trova in questa posizione:
        </p>
        <pre
          style={{
            background: '#f5f5f5',
            padding: 16,
            borderRadius: 8,
            overflowX: 'auto',
            fontSize: 14,
          }}
        >
{`mobile/build/app/outputs/flutter-apk/app-arm64-v8a-release.apk`}
        </pre>
        <p style={{ color: '#666', marginTop: 8, fontSize: 14 }}>
          Il file <code>app-arm64-v8a-release.apk</code> è quello per la
          maggior parte dei dispositivi Android moderni (64-bit). Sono generati
          anche versioni per altre architetture (<code>armeabi-v7a</code>,
          <code>x86_64</code>).
        </p>
      </div>

      <div className="card" style={{ maxWidth: 700, marginTop: 24 }}>
        <h3>3. Trasferisci via cavo USB</h3>
        <ol style={{ color: '#666', lineHeight: 1.8 }}>
          <li>
            Collega il telefono al PC tramite cavo USB.
          </li>
          <li>
            Sul telefono, se richiesto, seleziona la modalità{" "}
            <strong>"Trasferimento file"</strong> (MTP).
          </li>
          <li>
            Copia il file <code>app-arm64-v8a-release.apk</code> nella
            cartella <strong>Download</strong> del telefono.
          </li>
        </ol>
      </div>

      <div className="card" style={{ maxWidth: 700, marginTop: 24 }}>
        <h3>4. Installa l'APK sul telefono</h3>
        <ol style={{ color: '#666', lineHeight: 1.8 }}>
          <li>
            Sul telefono, apri l'app <strong>File</strong> o{" "}
            <strong>Gestione file</strong>.
          </li>
          <li>
            Naviga nella cartella <strong>Download</strong>.
          </li>
          <li>
            Tocca il file <code>app-arm64-v8a-release.apk</code>.
          </li>
          <li>
            Se richiesto, autorizza l'installazione da fonti sconosciute
            (solo la prima volta).
          </li>
          <li>
            Completa l'installazione e avvia l'app.
          </li>
        </ol>
      </div>

      <div className="card" style={{ maxWidth: 700, marginTop: 24 }}>
        <h3>5. Configura l'app</h3>
        <p style={{ color: '#666' }}>
          Al primo avvio, l'app mostrerà la schermata di scansione del
          QR Code. Inquadra il QR Code generato dal pannello{' '}
          <strong>"Genera QR"</strong> per configurare automaticamente
          l'app (server Supabase, guardie, percorsi, passphrase).
        </p>
      </div>
    </div>
  );
}
