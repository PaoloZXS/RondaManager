/// Modello per una guardia di sicurezza.
class Guardia {
  final String id;
  final String nome;
  final String pin; // Hash del PIN, mai in chiaro
  final String idSede; // Sede di appartenenza

  Guardia({
    required this.id,
    required this.nome,
    required this.pin,
    required this.idSede,
  });

  String get nomeCompleto => nome;

  factory Guardia.fromJson(Map<String, dynamic> json) {
    return Guardia(
      id: json['id'] as String,
      nome: json['nome'] as String,

      pin: json['pin'] as String,
      idSede: json['id_sede'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'nome': nome,
      'pin': pin,
      'id_sede': idSede,
    };
  }
}
