import 'dart:convert';
import 'dart:io';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../utils/cosntants.dart';

/// Servizio per la sincronizzazione con Supabase Storage.
/// Gestisce l'upload di CSV cifrati, foto e APK.
class SupabaseService {
  SupabaseClient? _client;
  bool _inizializzato = false;

  /// Inizializza il client Supabase con URL e Anon Key.
  Future<void> initialize(String url, String anonKey) async {
    if (_inizializzato) return;

    try {
      await Supabase.initialize(
        url: url,
        anonKey: anonKey,
      );
    } catch (_) {
      // Se già inizializzato (es. da ConfigurazioneScreen), recupera il client
    }

    _client = Supabase.instance.client;
    _inizializzato = true;
  }

  /// Restituisce il client Supabase, se inizializzato.
  SupabaseClient? get client => _client;

  /// Verifica se il telefono è bloccato.
  /// Legge un file marker su Supabase Storage.
  Future<bool> isTelefonoBloccato(String idTelefono) async {
    if (_client == null) return false;
    try {
      // Controlla se esiste un file di blocco per questo telefono
      await _client!.storage
          .from(AppConstants.bucketCsv)
          .download('bloccati/$idTelefono.lock');
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Carica un file CSV cifrato su Supabase Storage.
  Future<String> uploadCsv({
    required String idTelefono,
    required String nomeFile,
    required String contenutoCifrato,
  }) async {
    if (_client == null) throw Exception('Supabase non inizializzato');

    final path = '$idTelefono/csv/$nomeFile';
    final bytes = utf8.encode(contenutoCifrato);

    await _client!.storage
        .from(AppConstants.bucketCsv)
        .uploadBinary(path, bytes);

    return path;
  }

  /// Carica un file foto su Supabase Storage.
  Future<String> uploadFoto({
    required String idTelefono,
    required String nomeFile,
    required File file,
  }) async {
    if (_client == null) throw Exception('Supabase non inizializzato');

    final path = '$idTelefono/foto/$nomeFile';

    await _client!.storage
        .from(AppConstants.bucketFoto)
        .upload(path, file);

    return path;
  }

  /// Legge la scadenza sessione (in minuti) dalla tabella `impostazioni`.
  /// Se la chiave è assente o in caso di errore, usa il default di 480 minuti (8 ore).
  Future<int> getSessionTimeoutMinutes() async {
    if (_client == null) return 480;
    try {
      final res = await _client!
          .from('impostazioni')
          .select('valore')
          .eq('chiave', 'session_timeout_minutes')
          .maybeSingle();
      if (res == null) return 480;
      return int.tryParse(res['valore']?.toString() ?? '') ?? 480;
    } catch (_) {
      return 480;
    }
  }
}
