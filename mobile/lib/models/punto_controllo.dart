/// Modello per un punto di controllo (tag NFC fisico).
class PuntoControllo {
  final String id;
  final String descrizione;
  final String? idPercorso; // Percorso di appartenenza (nullable)

  PuntoControllo({
    required this.id,
    required this.descrizione,
    this.idPercorso,
  });

  factory PuntoControllo.fromJson(Map<String, dynamic> json) {
    return PuntoControllo(
      id: json['id'] as String,
      descrizione: json['descrizione'] as String,
      idPercorso: json['id_percorso'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'descrizione': descrizione,
      if (idPercorso != null) 'id_percorso': idPercorso,
    };
  }
}
