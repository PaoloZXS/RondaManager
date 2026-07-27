/// Costanti globali dell'applicazione.
class AppConstants {
  AppConstants._();

  /// URL di Supabase.
  static const String supabaseUrl = 'https://sixcslagfkoujyvephmu.supabase.co';

  /// Anon Key di Supabase.
  static const String supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpeGNzbGFnZmtvdWp5dmVwaG11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyNTgyODQsImV4cCI6MjA5OTgzNDI4NH0.tZqUb5URJslrpdYrzdL9ct9M-xl9qFjcqp37U3Hx4zw';

  /// ID del telefono (modificare prima del build per ogni dispositivo).
  static const String idTelefono = 'TEL-001';

  /// Passphrase offuscata (modificare prima del build).
  static const String passphraseDefault = 'Codarini2026';

  /// Segreto per retrocompatibilità (usato da crypto_service).
  static const String configQrSecret = 'R0nd4C0nfigS3cr3t!';

  /// Segreto hardcoded per la derivazione della chiave AES finale.
  static const String segretoHardcoded = 'R0nd4S3cr3t!';

  /// Nome del database SQLite locale.
  static const String dbName = 'ronda_manager.db';

  /// Versione del database.
  static const int dbVersion = 1;

  /// Nome del bucket Supabase per i CSV cifrati.
  static const String bucketCsv = 'ronde-csv';

  /// Nome del bucket Supabase per le foto.
  static const String bucketFoto = 'ronde-foto';

  /// Nome del bucket Supabase per gli APK.
  static const String bucketApk = 'ronde-apk';

  /// Prefisso per il nome del file CSV.
  static const String csvPrefisso = 'turno_';

  /// Estensione del file CSV.
  static const String csvEstensione = '.csv';

  /// Intervallo di default per il timeout di slog automatico (secondi).
  static const int timeoutSlogDefault = 300; // 5 minuti
}
