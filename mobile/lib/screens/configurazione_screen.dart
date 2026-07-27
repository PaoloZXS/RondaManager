import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/configurazione.dart';
import '../models/guardia.dart';
import '../models/percorso.dart';
import '../models/punto_controllo.dart';
import '../providers/app_state.dart';
import '../utils/cosntants.dart';

/// Schermata di configurazione iniziale.
/// L'operatore inserisce l'ID telefono comunicato dall'admin.
/// L'app scarica automaticamente guardie, percorsi e punti di controllo.
class ConfigurazioneScreen extends StatefulWidget {
  const ConfigurazioneScreen({super.key});

  @override
  State<ConfigurazioneScreen> createState() => _ConfigurazioneScreenState();
}

class _ConfigurazioneScreenState extends State<ConfigurazioneScreen> {
  final _idController = TextEditingController();
  bool _caricamento = false;
  String? _errore;

  @override
  void dispose() {
    _idController.dispose();
    super.dispose();
  }

  Future<void> _configura() async {
    final idTelefono = _idController.text.trim().toUpperCase();
    if (idTelefono.isEmpty) {
      setState(() => _errore = 'Inserisci l\'ID del telefono');
      return;
    }

    setState(() {
      _caricamento = true;
      _errore = null;
    });

    try {
      // Inizializza Supabase
      await Supabase.initialize(
        url: AppConstants.supabaseUrl,
        anonKey: AppConstants.supabaseAnonKey,
      );

      final client = Supabase.instance.client;

      // Verifica che il telefono esista su Supabase e prendi la sede
      final rLista = await client
          .from('telefoni')
          .select('id, bloccato, id_sede')
          .eq('id', idTelefono);

      if (rLista.isEmpty) {
        throw Exception('ID Telefono "$idTelefono" non valido. '
            'Riprova o contatta l\'amministratore.');
      }

      final rTelefono = rLista.first;
      if (rTelefono['bloccato'] == true) {
        throw Exception('Telefono "$idTelefono" bloccato.\n'
            'Contatta l\'amministratore.');
      }

      final idSede = rTelefono['id_sede'] as String;

      // Prendi i percorsi associati a questo telefono (via telefoni_percorsi)
      final rTelefoniPercorsi = await client
          .from('telefoni_percorsi')
          .select('id_percorso')
          .eq('id_telefono', idTelefono);

      if (rTelefoniPercorsi.isEmpty) {
        throw Exception('Nessun percorso assegnato al telefono "$idTelefono". '
            'Collega dei percorsi dal pannello web.');
      }

      final idsPercorsi = rTelefoniPercorsi
          .map((e) => e['id_percorso'] as String)
          .toList();

      // Scarica guardie filtrate per sede
      final rGuardie = await client
          .from('guardie')
          .select('*')
          .eq('id_sede', idSede);

      // Scarica percorsi filtrati per sede E associati a questo telefono
      final rPercorsi = await client
          .from('percorsi')
          .select('*')
          .eq('id_sede', idSede)
          .inFilter('id', idsPercorsi);

      // Scarica punti di controllo che appartengono ai percorsi filtrati
      final rPunti = await client
          .from('punti_controllo')
          .select('*')
          .inFilter('id_percorso', idsPercorsi);

      if (rGuardie.isEmpty || rPercorsi.isEmpty) {
        throw Exception('Nessun dato trovato per questo telefono. '
            'Configura prima guardie e percorsi dal pannello web.');
      }

      // Costruisce configurazione
      final guardie = (rGuardie).map((e) => Guardia(
            id: e['id'] as String,
            nome: e['nome'] as String,

            pin: _hashPin(e['pin'] as String),
            idSede: e['id_sede'] as String,
          )).toList();

      final percorsi = (rPercorsi)
          .map((e) => Percorso.fromJson(e))
          .toList();

      final puntiControllo = (rPunti)
          .map((e) => PuntoControllo.fromJson(e))
          .toList();

      final config = Configurazione(
        supabaseUrl: AppConstants.supabaseUrl,
        supabaseAnonKey: AppConstants.supabaseAnonKey,
        idTelefono: idTelefono,
        passphraseOffuscata: AppConstants.passphraseDefault,
        segretoHardcoded: AppConstants.segretoHardcoded,
        guardie: guardie,
        percorsi: percorsi,
        puntiControllo: puntiControllo,
      );

      if (!mounted) return;

      final state = context.read<AppState>();
      await state.salvaConfigurazione(config);

      if (!mounted) return;

      // Torna alla home per LoginScreen
      Navigator.of(context).popUntil((route) => route.isFirst);
    } catch (e) {
      if (mounted) {
        setState(() => _errore = e.toString().replaceFirst('Exception: ', ''));
      }
    } finally {
      if (mounted) {
        setState(() => _caricamento = false);
      }
    }
  }

  String _hashPin(String pin) {
    final bytes = utf8.encode(pin);
    final digest = sha256.convert(bytes);
    return digest.toString();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Configurazione App'),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.phone_android, size: 72, color: Colors.indigo),
              const SizedBox(height: 16),
              const Text(
                'Configurazione Telefono',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text(
                'Inserisci l\'ID telefono che ti ha comunicato l\'amministratore.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey, fontSize: 16),
              ),
              const SizedBox(height: 32),
              TextField(
                controller: _idController,
                decoration: const InputDecoration(
                  labelText: 'ID Telefono',
                  hintText: 'es. TEL-001',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.tag),
                ),
                textCapitalization: TextCapitalization.characters,
                autofocus: true,
              ),
              const SizedBox(height: 24),
              if (_errore != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Text(
                    _errore!,
                    style: const TextStyle(color: Colors.red),
                    textAlign: TextAlign.center,
                  ),
                ),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton.icon(
                  onPressed: _caricamento ? null : _configura,
                  icon: _caricamento
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.download),
                  label: Text(
                    _caricamento ? 'Configurazione in corso...' : 'Configura',
                    style: const TextStyle(fontSize: 18),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.indigo,
                    foregroundColor: Colors.white,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
