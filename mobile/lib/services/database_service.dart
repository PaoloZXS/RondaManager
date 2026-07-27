import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart' as p;
import '../models/turno.dart';
import '../models/timbro.dart';
import '../utils/cosntants.dart';

/// Servizio per la gestione del database SQLite locale (offline-first).
/// Salva turni, timbrature e configurazione.
class DatabaseService {
  static Database? _database;

  /// Restituisce l'istanza del database, creandola se necessario.
  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    final dbPath = await getDatabasesPath();
    final path = p.join(dbPath, AppConstants.dbName);

    return await openDatabase(
      path,
      version: AppConstants.dbVersion,
      onCreate: _onCreate,
    );
  }

  Future<void> _onCreate(Database db, int version) async {
    // Tabella configurazione
    await db.execute('''
      CREATE TABLE configurazione (
        chiave TEXT PRIMARY KEY,
        valore TEXT NOT NULL
      )
    ''');

    // Tabella turni
    await db.execute('''
      CREATE TABLE turni (
        id TEXT PRIMARY KEY,
        id_guardia TEXT NOT NULL,
        id_percorso TEXT NOT NULL,
        data_inizio TEXT NOT NULL,
        data_fine TEXT,
        completato INTEGER DEFAULT 0,
        sincronizzato INTEGER DEFAULT 0
      )
    ''');

    // Tabella timbri
    await db.execute('''
      CREATE TABLE timbri (
        id TEXT PRIMARY KEY,
        id_punto TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        latitudine REAL,
        longitudine REAL,
        batteria REAL NOT NULL,
        nota TEXT,
        nome_foto TEXT,
        id_guardia TEXT NOT NULL,
        id_turno TEXT NOT NULL,
        FOREIGN KEY (id_turno) REFERENCES turni(id)
      )
    ''');

    // Tabella foto in attesa di upload
    await db.execute('''
      CREATE TABLE foto_pending (
        id TEXT PRIMARY KEY,
        percorso_locale TEXT NOT NULL,
        nome_remoto TEXT NOT NULL,
        id_turno TEXT NOT NULL,
        caricata INTEGER DEFAULT 0
      )
    ''');
  }

  // ---- Configurazione ----

  Future<void> salvaConfigurazione(String chiave, String valore) async {
    final db = await database;
    await db.insert(
      'configurazione',
      {'chiave': chiave, 'valore': valore},
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<String?> leggiConfigurazione(String chiave) async {
    final db = await database;
    final result = await db.query(
      'configurazione',
      where: 'chiave = ?',
      whereArgs: [chiave],
    );
    if (result.isEmpty) return null;
    return result.first['valore'] as String;
  }

  // ---- Turni ----

  Future<void> salvaTurno(Turno turno) async {
    final db = await database;
    await db.insert(
      'turni',
      turno.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<void> aggiornaTurno(Turno turno) async {
    final db = await database;
    await db.update(
      'turni',
      turno.toMap(),
      where: 'id = ?',
      whereArgs: [turno.id],
    );
  }

  Future<Turno?> leggiTurnoCorrente() async {
    final db = await database;
    final result = await db.query(
      'turni',
      where: 'completato = 0',
      orderBy: 'data_inizio DESC',
      limit: 1,
    );
    if (result.isEmpty) return null;

    final turno = Turno.fromMap(result.first);
    turno.timbri.addAll(await leggiTimbri(turno.id));
    return turno;
  }

  Future<List<Turno>> leggiTurniNonSincronizzati() async {
    final db = await database;
    final result = await db.query(
      'turni',
      where: 'sincronizzato = 0 AND completato = 1',
    );
    return result.map((m) => Turno.fromMap(m)).toList();
  }

  /// Restituisce tutti i turni completati (sincronizzati e non).
  Future<List<Turno>> leggiTurniCompletati() async {
    final db = await database;
    final result = await db.query(
      'turni',
      where: 'completato = 1',
      orderBy: 'data_inizio DESC',
    );
    return result.map((m) => Turno.fromMap(m)).toList();
  }

  Future<void> segnaSincronizzato(String idTurno) async {
    final db = await database;
    await db.update(
      'turni',
      {'sincronizzato': 1},
      where: 'id = ?',
      whereArgs: [idTurno],
    );
  }

  Future<void> aggiornaSincronizzato(String idTurno, bool sincronizzato) async {
    final db = await database;
    await db.update(
      'turni',
      {'sincronizzato': sincronizzato ? 1 : 0},
      where: 'id = ?',
      whereArgs: [idTurno],
    );
  }

  // ---- Timbri ----

  Future<void> salvaTimbro(Timbro timbro) async {
    final db = await database;
    await db.insert(
      'timbri',
      timbro.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<List<Timbro>> leggiTimbri(String idTurno) async {
    final db = await database;
    final result = await db.query(
      'timbri',
      where: 'id_turno = ?',
      whereArgs: [idTurno],
      orderBy: 'timestamp ASC',
    );
    return result.map((m) => Timbro.fromMap(m)).toList();
  }

  // ---- Foto Pending ----

  Future<void> salvaFotoPending({
    required String id,
    required String percorsoLocale,
    required String nomeRemoto,
    required String idTurno,
  }) async {
    final db = await database;
    await db.insert('foto_pending', {
      'id': id,
      'percorso_locale': percorsoLocale,
      'nome_remoto': nomeRemoto,
      'id_turno': idTurno,
      'caricata': 0,
    });
  }

  Future<List<Map<String, dynamic>>> fotoPendingNonCaricate() async {
    final db = await database;
    return await db.query(
      'foto_pending',
      where: 'caricata = 0',
    );
  }

  Future<String?> leggiFotoPathLocale(String idTimbro) async {
    final db = await database;
    final result = await db.query(
      'foto_pending',
      where: 'id = ?',
      whereArgs: [idTimbro],
    );
    if (result.isEmpty) return null;
    return result.first['percorso_locale'] as String?;
  }

  Future<void> segnaFotoCaricata(String id) async {
    final db = await database;
    await db.update(
      'foto_pending',
      {'caricata': 1},
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  /// Chiude il database.
  Future<void> close() async {
    final db = await database;
    await db.close();
    _database = null;
  }
}
