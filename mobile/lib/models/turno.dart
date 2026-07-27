import 'timbro.dart';

/// Modello per un turno di ronda completo.
/// Contiene il percorso assegnato e la lista di timbrature.
class Turno {
  final String id;
  final String idGuardia;
  final String idPercorso;
  final DateTime dataInizio;
  DateTime? dataFine;
  bool completato;
  bool sincronizzato;
  final List<Timbro> timbri;

  Turno({
    required this.id,
    required this.idGuardia,
    required this.idPercorso,
    required this.dataInizio,
    this.dataFine,
    this.completato = false,
    this.sincronizzato = false,
    List<Timbro>? timbri,
  }) : timbri = timbri ?? [];

  /// Durata del turno in minuti
  int get durataMinuti {
    final fine = dataFine ?? DateTime.now();
    return fine.difference(dataInizio).inMinutes;
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'id_guardia': idGuardia,
      'id_percorso': idPercorso,
      'data_inizio': dataInizio.toUtc().toIso8601String(),
      'data_fine': dataFine?.toUtc().toIso8601String(),
      'completato': completato ? 1 : 0,
      'sincronizzato': sincronizzato ? 1 : 0,
    };
  }

  factory Turno.fromMap(Map<String, dynamic> map) {
    return Turno(
      id: map['id'] as String,
      idGuardia: map['id_guardia'] as String,
      idPercorso: map['id_percorso'] as String,
      dataInizio: DateTime.parse(map['data_inizio'] as String),
      dataFine: map['data_fine'] != null
          ? DateTime.parse(map['data_fine'] as String)
          : null,
      completato: (map['completato'] as int) == 1,
      sincronizzato: (map['sincronizzato'] as int) == 1,
    );
  }
}
