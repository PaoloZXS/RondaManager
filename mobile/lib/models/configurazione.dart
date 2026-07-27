import 'guardia.dart';
import 'percorso.dart';
import 'punto_controllo.dart';

/// Modello per la configurazione iniziale dell'app.
class Configurazione {
  final String supabaseUrl;
  final String supabaseAnonKey;
  final String idTelefono;
  final String passphraseOffuscata;
  final String segretoHardcoded;
  final List<Guardia> guardie;
  final List<Percorso> percorsi;
  final List<PuntoControllo> puntiControllo;
  final int timeoutSlogSecondi;
  final bool gpsObbligatorio;
  final double batteriaMinima;

  Configurazione({
    required this.supabaseUrl,
    required this.supabaseAnonKey,
    required this.idTelefono,
    required this.passphraseOffuscata,
    required this.segretoHardcoded,
    required this.guardie,
    required this.percorsi,
    this.puntiControllo = const [],
    this.timeoutSlogSecondi = 300,
    this.gpsObbligatorio = false,
    this.batteriaMinima = 10.0,
  });

  factory Configurazione.fromJson(Map<String, dynamic> json) {
    final rawGuardie = json['guardie'];
    final rawPercorsi = json['percorsi'];
    final rawPunti = json['punti_controllo'];

    return Configurazione(
      supabaseUrl: json['supabase_url'] as String,
      supabaseAnonKey: json['supabase_anon_key'] as String,
      idTelefono: json['id_telefono'] as String,
      passphraseOffuscata: json['passphrase'] as String,
      segretoHardcoded: json['segreto'] as String,
      guardie: rawGuardie != null
          ? (rawGuardie as List<dynamic>)
              .map((e) => Guardia.fromJson(e as Map<String, dynamic>))
              .toList()
          : [],
      percorsi: rawPercorsi != null
          ? (rawPercorsi as List<dynamic>)
              .map((e) => Percorso.fromJson(e as Map<String, dynamic>))
              .toList()
          : [],
      puntiControllo: rawPunti != null
          ? (rawPunti as List<dynamic>)
              .map((e) => PuntoControllo.fromJson(e as Map<String, dynamic>))
              .toList()
          : [],
      timeoutSlogSecondi: json['timeout_slog'] as int? ?? 300,
      gpsObbligatorio: json['gps_obbligatorio'] as bool? ?? false,
      batteriaMinima: (json['batteria_minima'] as num?)?.toDouble() ?? 10.0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'supabase_url': supabaseUrl,
      'supabase_anon_key': supabaseAnonKey,
      'id_telefono': idTelefono,
      'passphrase': passphraseOffuscata,
      'segreto': segretoHardcoded,
      'guardie': guardie.map((g) => g.toJson()).toList(),
      'percorsi': percorsi.map((p) => p.toJson()).toList(),
      'punti_controllo': puntiControllo.map((p) => p.toJson()).toList(),
      'timeout_slog': timeoutSlogSecondi,
      'gps_obbligatorio': gpsObbligatorio,
      'batteria_minima': batteriaMinima,
    };
  }
}
