import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:uuid/uuid.dart';
import '../models/configurazione.dart';
import '../models/guardia.dart';
import '../models/percorso.dart';
import '../models/timbro.dart';
import '../models/turno.dart';
import '../services/auth_service.dart';
import '../services/crypto_service.dart';
import '../services/database_service.dart';
import '../services/gps_service.dart';
import '../services/nfc_service.dart';
import '../services/supabase_service.dart';
import '../utils/cosntants.dart';

/// Stato centrale dell'applicazione.
/// Gestisce configurazione, autenticazione, turno e sincronizzazione.
class AppState extends ChangeNotifier {
  final AuthService _authService = AuthService();
  final CryptoServices _cryptoService = CryptoServices();
  final DatabaseService _databaseService = DatabaseService();
  final GpsService _gpsService = GpsService();
  final NfcService _nfcService = NfcService();
  final SupabaseService _supabaseService = SupabaseService();
  final Uuid _uuid = const Uuid();

  // ---- Stato ----
  Configurazione? _configurazione;
  Guardia? _guardiaCorrente;
  Turno? _turnoCorrente;
  bool _caricamento = false;
  String? _errore;
  Timer? _timerSlog;

  // ---- Getters ----
  bool get isConfigured => _configurazione != null;
  bool get isAuthenticated => _guardiaCorrente != null;
  bool get isInTurno => _turnoCorrente != null && !_turnoCorrente!.completato;
  bool get caricamento => _caricamento;
  String? get errore => _errore;
  Configurazione? get configurazione => _configurazione;
  Guardia? get guardiaCorrente => _guardiaCorrente;
  Turno? get turnoCorrente => _turnoCorrente;
  List<Guardia> get guardie => _configurazione?.guardie ?? [];
  List<Percorso> get percorsi => _configurazione?.percorsi ?? [];
  DatabaseService get database => _databaseService;
  SupabaseService get supabase => _supabaseService;

  /// Restituisce la descrizione di un punto di controllo dal suo ID NFC.
  /// Se non trovato, restituisce l'ID stesso.
  String getDescrizionePunto(String idPunto) {
    final punto = _configurazione?.puntiControllo
        .where((p) => p.id == idPunto)
        .firstOrNull;
    return punto?.descrizione ?? idPunto;
  }

  /// Inizializza lo stato, caricando configurazione e sessione dal DB locale.
  Future<void> initialize() async {
    _caricamento = true;
    notifyListeners();

    try {
      // Prova a caricare la configurazione salvata
      final configJson = await _databaseService.leggiConfigurazione('config');
      if (configJson != null) {
        final json = jsonDecode(configJson) as Map<String, dynamic>;
        _configurazione = Configurazione.fromJson(json);
        await _cryptoService.initialize(_configurazione!.passphraseOffuscata);

        // Inizializza Supabase
        await _supabaseService.initialize(
          _configurazione!.supabaseUrl,
          _configurazione!.supabaseAnonKey,
        );

        // Prova a caricare la sessione
        final guardiaId = await _authService.getGuardiaCorrente();
        if (guardiaId != null) {
          // Controllo scadenza sessione all'avvio (minuti configurati in Supabase)
          final timeoutMinuti = await _supabaseService.getSessionTimeoutMinutes();
          final loginTimestamp = await _authService.getSessionTimestamp();
          final sessioneScaduta = loginTimestamp != null &&
              DateTime.now().difference(loginTimestamp) >
                  Duration(minutes: timeoutMinuti);
          if (sessioneScaduta) {
            await _authService.logout();
          } else {
            _guardiaCorrente = _configurazione!.guardie
                .where((g) => g.id == guardiaId)
                .firstOrNull;
          }
        }

        // Carica turno corrente
        _turnoCorrente = await _databaseService.leggiTurnoCorrente();
      }
      // Se non configurato, AppEntryPoint mostrerà ConfigurazioneScreen
    } catch (e) {
      _errore = 'Errore inizializzazione: $e';
    }

    _caricamento = false;
    notifyListeners();
  }

  /// Salva la configurazione.
  Future<void> salvaConfigurazione(Configurazione config) async {
    _caricamento = true;
    notifyListeners();

    try {
      _configurazione = config;
      await _cryptoService.initialize(config.passphraseOffuscata);
      await _supabaseService.initialize(config.supabaseUrl, config.supabaseAnonKey);

      // Salva nel DB locale
      await _databaseService.salvaConfigurazione(
        'config',
        jsonEncode(config.toJson()),
      );
    } catch (e) {
      _errore = 'Errore salvataggio configurazione: $e';
    }

    _caricamento = false;
    notifyListeners();
  }

  /// Esegue il login della guardia.
  Future<bool> login(Guardia guardia, String pin) async {
    _caricamento = true;
    _errore = null;
    notifyListeners();

    try {
      final valido = await _authService.verificaPin(guardia.id, pin, guardia);
      if (!valido) {
        _errore = 'PIN non valido';
        _caricamento = false;
        notifyListeners();
        return false;
      }

      _guardiaCorrente = guardia;
      await _authService.setGuardiaCorrente(guardia.id);
      _avviaTimerSlog();

      _caricamento = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errore = 'Errore login: $e';
      _caricamento = false;
      notifyListeners();
      return false;
    }
  }

  /// Logout della guardia corrente.
  Future<void> logout() async {
    _terminaTimerSlog();
    _guardiaCorrente = null;
    _turnoCorrente = null;
    await _authService.logout();
    notifyListeners();
  }

  /// Inizia un nuovo turno.
  Future<void> iniziaTurno(String idPercorso) async {
    if (_guardiaCorrente == null) return;

    final turno = Turno(
      id: _uuid.v4(),
      idGuardia: _guardiaCorrente!.id,
      idPercorso: idPercorso,
      dataInizio: DateTime.now(),
    );

    _turnoCorrente = turno;
    await _databaseService.salvaTurno(turno);
    notifyListeners();
  }

  /// Registra una timbratura NFC.
  Future<Timbro> registraTimbro({
    required String idPunto,
    String? nota,
    String? nomeFoto,
    String? percorsoFoto,
  }) async {
    if (_guardiaCorrente == null || _turnoCorrente == null) {
      throw Exception('Nessun turno o guardia attiva');
    }

    final timbro = Timbro(
      id: _uuid.v4(),
      idPunto: idPunto,
      timestamp: DateTime.now(),
      batteriaPercentuale: await _gpsService.getBatteria(),
      nota: nota,
      nomeFoto: nomeFoto,
      idGuardia: _guardiaCorrente!.id,
      idTurno: _turnoCorrente!.id,
    );

    // Se c'è una foto, copiala in cartella persistente
    String? percorsoPersistente;
    if (percorsoFoto != null && percorsoFoto!.isNotEmpty) {
      percorsoPersistente = await _salvaFotoPersistente(percorsoFoto!);
    }

    _turnoCorrente!.timbri.add(timbro);
    await _databaseService.salvaTimbro(timbro);

    // Se c'è una foto, registra nei pending per upload futuro
    if (nomeFoto != null && nomeFoto!.isNotEmpty) {
      await _databaseService.salvaFotoPending(
        id: timbro.id,
        percorsoLocale: percorsoPersistente ?? percorsoFoto ?? nomeFoto!,
        nomeRemoto: nomeFoto!,
        idTurno: _turnoCorrente!.id,
      );
    }

    // Reset timer di slog ad ogni azione
    _resetTimerSlog();

    notifyListeners();
    return timbro;
  }

  /// Aggiorna la nota e/o foto di un timbro esistente.
  Future<void> aggiornaTimbro(String timbroId, {String? nota, String? nomeFoto, String? percorsoFoto}) async {
    if (_turnoCorrente == null) return;

    final idx = _turnoCorrente!.timbri.indexWhere((t) => t.id == timbroId);
    if (idx == -1) return;

    final timbro = _turnoCorrente!.timbri[idx];
    timbro.nota = nota;
    timbro.nomeFoto = nomeFoto;

    // Aggiorna nel DB locale (salvaTimbro usa ConflictAlgorithm.replace)
    await _databaseService.salvaTimbro(timbro);

    // Se c'è una foto, copiala in cartella persistente e registra pending
    if (nomeFoto != null && nomeFoto!.isNotEmpty) {
      String? percorsoPersistente;
      if (percorsoFoto != null && percorsoFoto!.isNotEmpty) {
        percorsoPersistente = await _salvaFotoPersistente(percorsoFoto!);
      }
      await _databaseService.salvaFotoPending(
        id: timbro.id,
        percorsoLocale: percorsoPersistente ?? percorsoFoto ?? nomeFoto!,
        nomeRemoto: nomeFoto!,
        idTurno: _turnoCorrente!.id,
      );
    }

    // Segna il turno come non sincronizzato per forzare il re-upload
    _turnoCorrente!.sincronizzato = false;
    await _databaseService.aggiornaSincronizzato(_turnoCorrente!.id, false);

    notifyListeners();
  }

  /// Completa il turno corrente.
  Future<void> completaTurno() async {
    if (_turnoCorrente == null) return;

    _turnoCorrente!.dataFine = DateTime.now();
    _turnoCorrente!.completato = true;
    await _databaseService.aggiornaTurno(_turnoCorrente!);

    // Prova a sincronizzare subito
    await sincronizzaTurni();

    notifyListeners();
  }

  /// Sincronizza i turni completati non ancora inviati.
  Future<void> sincronizzaTurni() async {
    if (_configurazione == null) return;

    try {
      // Verifica se telefono bloccato
      final bloccato = await _supabaseService.isTelefonoBloccato(
        _configurazione!.idTelefono,
      );
      if (bloccato) {
        _errore = 'Telefono bloccato. Contatta l\'amministratore.';
        notifyListeners();
        return;
      }

      final turni = await _databaseService.leggiTurniNonSincronizzati();
      for (final turno in turni) {
        await _inviaTurno(turno);
      }
    } catch (e) {
      _errore = 'Errore sincronizzazione: $e';
      notifyListeners();
    }
  }

  /// Invia un singolo turno a Supabase.
  Future<void> _inviaTurno(Turno turno) async {
    if (_configurazione == null) return;

    // Carica i timbri associati al turno (non caricati da leggiTurniNonSincronizzati)
    turno.timbri.addAll(await _databaseService.leggiTimbri(turno.id));

    // Genera CSV con dati cifrati
    final csvLines = <String>[];
    // Intestazione
    csvLines.add('id,id_punto,timestamp,batteria,nota,nome_foto,id_guardia,id_turno');

    for (final timbro in turno.timbri) {
      final row = timbro.toCsvMap();
      csvLines.add(
        '${row['id']},'
        '${row['id_punto']},'
        '${row['timestamp']},'
        '${row['batteria']},'
        '"${row['nota'].toString().replaceAll(',', ' ').replaceAll('\n', ' ')}",'
        '${row['nome_foto']},'
        '${row['id_guardia']},'
        '${row['id_turno']}',
      );
    }

    final csvContent = csvLines.join('\n');

    // Cifra il CSV
    final csvCifrato = await _cryptoService.encrypt(csvContent);

    // Nome file: turno_IDtelefono_IDguardia_IDturno_data.csv
    final nomeFile = '${AppConstants.csvPrefisso}'
        '${_configurazione!.idTelefono}_'
        '${turno.idGuardia}_'
        '${turno.id}_'
        '${turno.dataInizio.toIso8601String().replaceAll(':', '-')}'
        '${AppConstants.csvEstensione}';

    // Upload CSV
    await _supabaseService.uploadCsv(
      idTelefono: _configurazione!.idTelefono,
      nomeFile: nomeFile,
      contenutoCifrato: csvCifrato,
    );

    // Upload foto pending
    final fotoPending = await _databaseService.fotoPendingNonCaricate();
    for (final foto in fotoPending) {
      if (foto['id_turno'] == turno.id) {
        final file = await _getFotoFile(foto['percorso_locale'] as String);
        if (file != null) {
          await _supabaseService.uploadFoto(
            idTelefono: _configurazione!.idTelefono,
            nomeFile: foto['nome_remoto'] as String,
            file: file,
          );
          await _databaseService.segnaFotoCaricata(foto['id'] as String);
          // Elimina il file locale dopo upload riuscito
          try {
            await file.delete();
          } catch (_) {
            // Se non si riesce a cancellare, non blocchiamo
          }
        }
      }
    }

    // Registra il turno nella tabella turni di Supabase (per il pannello web)
    try {
      final turnoMap = turno.toMap();
      turnoMap['sincronizzato'] = 1; // Segna come sincronizzato su Supabase
      await _supabaseService.client!
          .from('turni')
          .upsert(turnoMap, onConflict: 'id');
    } catch (_) {
      // Se fallisce, il CSV è già stato caricato, non blocchiamo
    }

    await _databaseService.segnaSincronizzato(turno.id);
  }

  /// Copia la foto in una cartella persistente dell'app (non temporanea).
  Future<String?> _salvaFotoPersistente(String percorsoOriginale) async {
    try {
      final dir = await getApplicationDocumentsDirectory();
      final fotoDir = Directory('${dir.path}/foto');
      if (!await fotoDir.exists()) await fotoDir.create(recursive: true);

      final nomeFile = '${DateTime.now().millisecondsSinceEpoch}.jpg';
      final destinazione = '${fotoDir.path}/$nomeFile';
      final fileOriginale = File(percorsoOriginale);
      if (!await fileOriginale.exists()) return null;

      await fileOriginale.copy(destinazione);
      return destinazione;
    } catch (_) {
      return null;
    }
  }

  Future<File?> _getFotoFile(String path) async {
    try {
      final file = File(path);
      if (await file.exists()) return file;
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Resetta l'errore.
  void clearErrore() {
    _errore = null;
    notifyListeners();
  }

  // ---- Timer Slog Automatico ----

  void _avviaTimerSlog() {
    _terminaTimerSlog();
    final timeout = _configurazione?.timeoutSlogSecondi ??
        AppConstants.timeoutSlogDefault;
    _timerSlog = Timer(Duration(seconds: timeout), () async {
      await logout();
    });
  }

  void _resetTimerSlog() {
    _avviaTimerSlog();
  }

  void _terminaTimerSlog() {
    _timerSlog?.cancel();
    _timerSlog = null;
  }

  @override
  void dispose() {
    _terminaTimerSlog();
    super.dispose();
  }
}
