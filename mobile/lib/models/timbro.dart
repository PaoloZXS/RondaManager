/// Modello per una singola timbratura NFC.
/// Contiene tutti i dati raccolti al momento del timbro.
class Timbro {
  final String id;
  final String idPunto;
  final DateTime timestamp;
  final double batteriaPercentuale;
  String? nota;
  String? nomeFoto; // Nome del file foto su Supabase
  final String idGuardia;
  final String idTurno;

  Timbro({
    required this.id,
    required this.idPunto,
    required this.timestamp,
    required this.batteriaPercentuale,
    this.nota,
    this.nomeFoto,
    required this.idGuardia,
    required this.idTurno,
  });

  /// Converte in mappa per la cifratura CSV
  Map<String, dynamic> toCsvMap() {
    return {
      'id': id,
      'id_punto': idPunto,
      'timestamp': timestamp.toIso8601String(),
      'batteria': batteriaPercentuale.toString(),
      'nota': nota ?? '',
      'nome_foto': nomeFoto ?? '',
      'id_guardia': idGuardia,
      'id_turno': idTurno,
    };
  }

  factory Timbro.fromMap(Map<String, dynamic> map) {
    return Timbro(
      id: map['id'] as String,
      idPunto: map['id_punto'] as String,
      timestamp: DateTime.parse(map['timestamp'] as String),
      batteriaPercentuale: (map['batteria'] as num).toDouble(),
      nota: map['nota'] as String?,
      nomeFoto: map['nome_foto'] as String?,
      idGuardia: map['id_guardia'] as String,
      idTurno: map['id_turno'] as String,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'id_punto': idPunto,
      'timestamp': timestamp.toIso8601String(),
      'batteria': batteriaPercentuale,
      'nota': nota,
      'nome_foto': nomeFoto,
      'id_guardia': idGuardia,
      'id_turno': idTurno,
    };
  }
}
