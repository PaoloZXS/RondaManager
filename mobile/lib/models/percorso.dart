/// Modello per un percorso di ronda (sequenza di punti di controllo con tempi stimati).
class Percorso {
  final String id;
  final String nome;
  final List<PuntoSequenza> sequenzaPunti; // Punti con tempo stimato
  final String idSede; // Sede di appartenenza

  Percorso({
    required this.id,
    required this.nome,
    required this.sequenzaPunti,
    required this.idSede,
  });

  factory Percorso.fromJson(Map<String, dynamic> json) {
    final rawList = json['sequenza_punti'] as List<dynamic>;
    return Percorso(
      id: json['id'] as String,
      nome: json['nome'] as String,
      sequenzaPunti: rawList.map((e) {
        if (e is String) {
          return PuntoSequenza(id: e, tempoStimato: 0);
        }
        return PuntoSequenza.fromJson(e as Map<String, dynamic>);
      }).toList(),
      idSede: json['id_sede'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'nome': nome,
      'sequenza_punti': sequenzaPunti.map((p) => p.toJson()).toList(),
      'id_sede': idSede,
    };
  }
}

/// Un punto nella sequenza del percorso con tempo stimato in minuti.
class PuntoSequenza {
  final String id;
  final int tempoStimato; // minuti dall'inizio del turno

  PuntoSequenza({
    required this.id,
    this.tempoStimato = 0,
  });

  factory PuntoSequenza.fromJson(Map<String, dynamic> json) {
    return PuntoSequenza(
      id: json['id'] as String,
      tempoStimato: (json['tempo_stimato'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'tempo_stimato': tempoStimato,
    };
  }
}
