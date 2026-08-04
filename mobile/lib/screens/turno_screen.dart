import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/timbro.dart';
import '../models/turno.dart';
import '../providers/app_state.dart';
import '../services/nfc_service.dart';
import 'timbro_detail_screen.dart';

/// Schermata principale del turno.
class TurnoScreen extends StatefulWidget {
  const TurnoScreen({super.key});

  @override
  State<TurnoScreen> createState() => _TurnoScreenState();
}

class _TurnoScreenState extends State<TurnoScreen> {
  bool _nfcInAttesa = false;

  @override
  void initState() {
    super.initState();
  }

  void _mostraSceltaPercorso(AppState state) {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Icon(Icons.route, color: Colors.indigo),
            const SizedBox(width: 8),
            const Expanded(
              child: Text('Scegli percorso', style: TextStyle(fontSize: 20)),
            ),
            IconButton(
              icon: const Icon(Icons.close),
              onPressed: () => Navigator.of(ctx).pop(),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Seleziona il percorso da eseguire:',
              style: TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 12),
            ...state.percorsi.map((percorso) {
              return Card(
                margin: const EdgeInsets.symmetric(vertical: 4),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: Colors.indigo.shade100),
                ),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: Colors.indigo.shade100,
                    child: const Icon(Icons.route, color: Colors.indigo),
                  ),
                  title: Text(percorso.nome,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  subtitle: Text('${percorso.sequenzaPunti.length} punti'),
                  trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                  onTap: () {
                    Navigator.of(ctx).pop();
                    state.iniziaTurno(percorso.id);
                  },
                ),
              );
            }),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Annulla'),
          ),
        ],
      ),
    );
  }

  /// Carica turni completati con il conteggio delle letture.
  /// Mostra il riepilogo dettagliato di una ronda completata.
  void _mostraDettaglioRonda(AppState state, Turno turno) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Icon(Icons.description, color: Colors.indigo),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                state.percorsi.where((p) => p.id == turno.idPercorso).firstOrNull?.nome ?? 'Riepilogo',
                style: const TextStyle(fontSize: 20),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.close),
              onPressed: () => Navigator.of(ctx).pop(),
            ),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: FutureBuilder<List<Timbro>>(
            future: state.database.leggiTimbri(turno.id),
            builder: (context, snapshot) {
              final timbri = snapshot.data ?? [];
              return Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Info turno
                  _dettaglioInfo('🕐 Inizio', _formatData(turno.dataInizio)),
                  if (turno.dataFine != null)
                    _dettaglioInfo('🏁 Fine', _formatData(turno.dataFine!)),
                  if (turno.dataFine != null) ...[
                    _dettaglioInfo('⏱ Durata', _formatDurata(turno.dataInizio, turno.dataFine!)),
                  ],
                  _dettaglioInfo('📋 Letture', '${timbri.length}'),
                  _dettaglioInfo(
                    '📡 Sync',
                    turno.sincronizzato ? '✅ Sincronizzato' : '⏳ Da sincronizzare',
                  ),
                  const Divider(height: 24),
                  const Text('Dettaglio letture:',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                  const SizedBox(height: 8),
                  if (timbri.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(12),
                      child: Text('Nessuna lettura registrata.',
                        style: TextStyle(color: Colors.grey),
                      ),
                    )
                  else
                    Expanded(
                      child: ListView.builder(
                        shrinkWrap: true,
                        itemCount: timbri.length,
                        itemBuilder: (context, index) {
                          final tb = timbri[index];
                          final desc = state.configurazione?.puntiControllo
                              .where((p) => p.id == tb.idPunto).firstOrNull
                              ?.descrizione ?? tb.idPunto;
                          return Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: Colors.grey.shade50,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.grey.shade200),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    CircleAvatar(
                                      radius: 12,
                                      backgroundColor: Colors.indigo.shade100,
                                      child: Text('${index + 1}',
                                        style: TextStyle(fontSize: 11, color: Colors.indigo, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(desc,
                                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(_formatData(tb.timestamp),
                                  style: const TextStyle(color: Colors.grey, fontSize: 12),
                                ),
                                if (tb.nota != null && tb.nota!.isNotEmpty)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 4),
                                    child: Row(
                                      children: [
                                        const Icon(Icons.notes, size: 14, color: Colors.grey),
                                        const SizedBox(width: 4),
                                        Expanded(
                                          child: Text(tb.nota!,
                                            style: const TextStyle(fontSize: 13),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                if (tb.nomeFoto != null && tb.nomeFoto!.isNotEmpty)
                                  const Padding(
                                    padding: EdgeInsets.only(top: 4),
                                    child: Row(
                                      children: [
                                        Icon(Icons.photo, size: 14, color: Colors.grey),
                                        SizedBox(width: 4),
                                        Text('Con foto', style: TextStyle(fontSize: 13, color: Colors.grey)),
                                      ],
                                    ),
                                  ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                ],
              );
            },
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Chiudi'),
          ),
        ],
      ),
    );
  }

  Future<List<_TurnoConLetture>> _caricaTurniConLetture(AppState state) async {
    final turni = await state.database.leggiTurniCompletati();
    final risultati = <_TurnoConLetture>[];
    for (final t in turni) {
      final timbri = await state.database.leggiTimbri(t.id);
      risultati.add(_TurnoConLetture(turno: t, numLetture: timbri.length));
    }
    return risultati;
  }

  /// Mostra dialog con la lista dei giri completati.
  void _mostraGiriEseguiti(AppState state) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Icon(Icons.history, color: Colors.indigo),
            const SizedBox(width: 8),
            const Expanded(child: Text('Ronde eseguite', style: TextStyle(fontSize: 20))),
            IconButton(
              icon: const Icon(Icons.close),
              onPressed: () => Navigator.of(ctx).pop(),
            ),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: FutureBuilder<List<_TurnoConLetture>>(
            future: _caricaTurniConLetture(state),
            builder: (context, snapshot) {
              if (!snapshot.hasData || snapshot.data!.isEmpty) {
                return const Padding(
                  padding: EdgeInsets.all(24),
                  child: Text('Nessun giro completato.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.grey),
                  ),
                );
              }
              final turni = snapshot.data!;
              return Column(
                mainAxisSize: MainAxisSize.min,
                children: turni.map((item) {
                  final p = state.percorsi
                      .where((p) => p.id == item.turno.idPercorso).firstOrNull;
                  return Card(
                    margin: const EdgeInsets.symmetric(vertical: 4),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(4),
                      onTap: () {
                        Navigator.of(ctx).pop();
                        _mostraDettaglioRonda(state, item.turno);
                      },
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(p?.nome ?? 'Percorso',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                      fontSize: 15,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '${item.numLetture} letture - ${_formatData(item.turno.dataInizio)}',
                                    style: const TextStyle(color: Colors.grey, fontSize: 13),
                                    maxLines: 1,
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            if (item.turno.sincronizzato)
                              const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.cloud_done, size: 16, color: Colors.green),
                                  SizedBox(width: 4),
                                  Text('Sync', style: TextStyle(color: Colors.green, fontSize: 12, fontWeight: FontWeight.w600)),
                                ],
                              )
                            else
                              const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.cloud_upload, size: 16, color: Colors.orange),
                                  SizedBox(width: 4),
                                  Text('Da sync', style: TextStyle(color: Colors.orange, fontSize: 12, fontWeight: FontWeight.w600)),
                                ],
                              ),
                          ],
                        ),
                      ),
                    ),
                  );
                }).toList(),
              );
            },
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Chiudi'),
          ),
        ],
      ),
    );
  }

  Future<void> _leggiNfc() async {
    setState(() => _nfcInAttesa = true);
    try {
      final nfcService = NfcService();
      final disponibile = await nfcService.isNfcAvailable();
      if (!disponibile && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('NFC non disponibile su questo dispositivo'),
            backgroundColor: Colors.orange,
          ),
        );
        if (mounted) setState(() => _nfcInAttesa = false);
        return;
      }
      final idPunto = await nfcService.readTagId();
      if (mounted) await _elaboraTimbro(idPunto);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Errore NFC: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
    if (mounted) setState(() => _nfcInAttesa = false);
  }

  Future<void> _confermaFineTurno() async {
    final state = context.read<AppState>();
    // Ricarica i timbri dal DB prima del controllo di completezza percorso
    await state.ricaricaTimbriTurnoCorrente();
    if (!mounted) return;
    final turno = state.turnoCorrenteSync;
    final percorso = turno != null
        ? state.percorsi.where((p) => p.id == turno.idPercorso).firstOrNull
        : null;

    // Verifica se tutti i punti del percorso sono stati letti
    if (turno != null && percorso != null && !turno.completato) {
      final idsPuntiLetti = turno.timbri.map((t) => t.idPunto).toSet();
      final idsPuntiRichiesti = percorso.sequenzaPunti.map((p) => p.id).toSet();
      final mancanti = idsPuntiRichiesti.difference(idsPuntiLetti);

      if (mancanti.isNotEmpty) {
        final nomiMancanti = mancanti.map((id) {
          return state.configurazione?.puntiControllo
              .where((p) => p.id == id)
              .firstOrNull
              ?.descrizione ?? id;
        }).toList();

        final avviso = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Row(
              children: [
                Icon(Icons.warning_amber, color: Colors.orange),
                SizedBox(width: 8),
                Text('Percorso non completo'),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Non hai letto tutti i punti del percorso:'),
                const SizedBox(height: 12),
                ...nomiMancanti.map((nome) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    children: [
                      const Icon(Icons.cancel, size: 18, color: Colors.red),
                      const SizedBox(width: 8),
                      Text(nome, style: const TextStyle(fontWeight: FontWeight.w500)),
                    ],
                  ),
                )),
                const SizedBox(height: 16),
                const Text('Sei sicuro di voler completare lo stesso?',
                  style: TextStyle(color: Colors.grey),
                ),
              ],
            ),
            actions: [
              ElevatedButton(
                onPressed: () => Navigator.of(ctx).pop(false),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.indigo,
                  foregroundColor: Colors.white,
                ),
                child: const Text('Torna al turno'),
              ),
              ElevatedButton(
                onPressed: () => Navigator.of(ctx).pop(true),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.orange,
                  foregroundColor: Colors.white,
                ),
                child: const Text('Completa lo stesso'),
              ),
            ],
          ),
        );
        if (avviso == false || !mounted) return;
      }
    }

    final conferma = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Fine Turno'),
        content: const Text(
          'Sei sicuro di voler completare il turno?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Annulla'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.indigo,
              foregroundColor: Colors.white,
            ),
            child: const Text('Completa Turno'),
          ),
        ],
      ),
    );

    if (conferma == true && mounted) {
      await state.completaTurno();
      if (!mounted) return;

      await showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) {
          final isOk = state.errore == null;
          return AlertDialog(
            icon: Icon(
              isOk ? Icons.check_circle : Icons.warning_amber,
              size: 48,
              color: isOk ? Colors.green : Colors.orange,
            ),
            title: Text(isOk ? 'Turno Completato' : 'Turno Salvato'),
            content: Text(
              isOk
                  ? '✅ Turno completato e sincronizzato con successo!'
                  : '✅ Turno salvato in locale.\n⚠️ Errore sincronizzazione:\n${state.errore}\n\n'
                      'Premi 🔄 Sincronizza dall\'app per riprovare.',
            ),
            actions: [
              ElevatedButton(
                onPressed: () => Navigator.of(ctx).pop(),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.indigo,
                  foregroundColor: Colors.white,
                ),
                child: const Text('OK'),
              ),
            ],
          );
        },
      );
    }
  }

  Future<void> _elaboraTimbro(String idPunto) async {
    if (!mounted) return;
    final state = context.read<AppState>();
    final punto = state.configurazione?.puntiControllo
        .where((p) => p.id == idPunto)
        .firstOrNull;
    final descrizione = punto?.descrizione ?? idPunto;

    // Trova l'ultimo punto del percorso corrente
    final turnoCorrente = await state.turnoCorrente;
    final percorso = state.configurazione?.percorsi
        .where((p) => p.id == turnoCorrente?.idPercorso)
        .firstOrNull;
    final isUltimoPunto = percorso != null &&
        percorso.sequenzaPunti.isNotEmpty &&
        percorso.sequenzaPunti.last.id == idPunto;

    if (!mounted) return;
    final descPunto = state.configurazione?.puntiControllo
        .where((p) => p.id == idPunto)
        .firstOrNull
        ?.descrizione;
    final result = await Navigator.of(context).push<TimbroResult>(
      MaterialPageRoute(
        builder: (_) => TimbroDetailScreen(
          idPunto: idPunto,
          descrizionePunto: descPunto,
        ),
      ),
    );

    if (result != null && mounted) {
      final s = context.read<AppState>();
      await s.registraTimbro(
        idPunto: idPunto,
        nota: result.nota,
        nomeFoto: result.nomeFoto,
        percorsoFoto: result.percorsoFoto,
      );
      if (!mounted) return;

      if (isUltimoPunto) {
        // Ultimo punto letto → chiedi se completare il turno
        final conferma = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Percorso completato'),
            content: Text(
              'Percorso Ronda "${percorso?.nome ?? 'sconosciuto'}" completato.\nScegliere COMPLETA per sincronizzare tutti i dati con il Server.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(ctx).pop(false),
                child: const Text('Annulla'),
              ),
              ElevatedButton(
                onPressed: () => Navigator.of(ctx).pop(true),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.indigo,
                  foregroundColor: Colors.white,
                ),
                child: const Text('Completa'),
              ),
            ],
          ),
        );

        if (conferma == true && mounted) {
          await s.completaTurno();
          if (!mounted) return;

          await showDialog(
            context: context,
            barrierDismissible: false,
            builder: (ctx) {
              final isOk = s.errore == null;
              return AlertDialog(
                icon: Icon(
                  isOk ? Icons.check_circle : Icons.warning_amber,
                  size: 48,
                  color: isOk ? Colors.green : Colors.orange,
                ),
                title: Text(isOk ? 'Turno Completato' : 'Turno Salvato'),
                content: Text(
                  isOk
                      ? '✅ Turno completato e sincronizzato con successo!'
                      : '✅ Turno salvato in locale.\n⚠️ Errore sincronizzazione:\n${s.errore}\n\n'
                          'Premi 🔄 Sincronizza dall\'app per riprovare.',
                ),
                actions: [
                  ElevatedButton(
                    onPressed: () => Navigator.of(ctx).pop(),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.indigo,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('OK'),
                  ),
                ],
              );
            },
          );
        }
      } else {
        // Punto intermedio → solo conferma
        if (mounted) {
          final desc = s.getDescrizionePunto(idPunto);
          showDialog(
            context: context,
            barrierDismissible: true,
            barrierColor: Colors.black26,
            builder: (ctx) {
              Future.delayed(const Duration(milliseconds: 1500), () {
                if (ctx.mounted) Navigator.of(ctx).pop();
              });
              return AlertDialog(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 32, vertical: 24),
                content: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.check_circle, size: 48, color: Colors.green),
                    const SizedBox(height: 12),
                    Text('✅ $desc',
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    const Text('Timbro registrato', style: TextStyle(color: Colors.grey)),
                  ],
                ),
              );
            },
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('StrigeKeeper'),
        automaticallyImplyLeading: false,
      ),
      body: Consumer<AppState>(
        builder: (context, state, _) {
          if (state.caricamento) {
            return const Center(child: CircularProgressIndicator());
          }

          final turno = state.turnoCorrenteSync;

          return Column(
            children: [
              // Barra azioni sotto il titolo
              _buildActionBar(state),
              // Nome sorvegliante e ID telefono
              if (state.guardiaCorrente != null)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Icon(Icons.person, size: 16, color: Colors.indigo.shade300),
                          const SizedBox(width: 6),
                          Text(
                            'Sorvegliante: ${state.guardiaCorrente!.nomeCompleto}',
                            style: TextStyle(fontSize: 13, color: Colors.indigo.shade400, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      if (state.configurazione != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              Icon(Icons.phone_android, size: 16, color: Colors.indigo.shade300),
                              const SizedBox(width: 6),
                              Text(
                                'ID telefono: ${state.configurazione!.idTelefono}',
                                style: TextStyle(fontSize: 12, color: Colors.indigo.shade300, fontWeight: FontWeight.w500),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              if (turno != null && !turno.completato)
              if (turno != null && !turno.completato)
                _buildTurnoCard(state),
              if (turno != null && !turno.completato && turno.timbri.isNotEmpty)
                Expanded(child: _buildTimeline(turno.timbri)),
              if (turno != null && !turno.completato && turno.timbri.isEmpty)
                const Expanded(
                  child: Center(
                    child: Text(
                      'Nessun timbro ancora registrato.\n'
                      'Avvicina il telefono al tag NFC.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.grey, fontSize: 16),
                    ),
                  ),
                ),
              if (turno == null || turno.completato)
                Expanded(
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Image.asset(
                          'assets/logo.png',
                          width: 80,
                          height: 80,
                          fit: BoxFit.contain,
                        ),
                        const SizedBox(height: 12),
                        const Text(
                          'StrigeKeeper',
                          style: TextStyle(fontSize: 24, color: Colors.indigo, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Nessun turno in corso',
                          style: TextStyle(fontSize: 16, color: Colors.grey),
                        ),
                      ],
                    ),
                  ),
                ),
              if (turno != null && !turno.completato)
                _buildNfcButton(),
            ],
          );
        },
      ),
    );
  }

  /// Barra azioni sotto il titolo.
  Widget _buildActionBar(AppState state) {
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 8, 12, 0),
      decoration: BoxDecoration(
        color: Colors.indigo.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.indigo.shade100, width: 1),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _actionItem(
            icon: Icons.route,
            label: 'Nuovo Giro',
            onTap: () => _mostraSceltaPercorso(state),
          ),
          _actionItem(
            icon: Icons.history,
            label: 'Ronde eseguite',
            onTap: () => _mostraGiriEseguiti(state),
          ),
          _actionItem(
            icon: Icons.sync,
            label: 'Sincronizza',
            onTap: () async {
              // Mostra spinner durante la sincronizzazione
              showDialog(
                context: context,
                barrierDismissible: false,
                builder: (_) => const Center(
                  child: Card(
                    child: Padding(
                      padding: EdgeInsets.all(24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          CircularProgressIndicator(),
                          SizedBox(height: 16),
                          Text('Sincronizzazione in corso...'),
                        ],
                      ),
                    ),
                  ),
                ),
              );
              state.clearErrore();
              await state.sincronizzaTurni();
              if (!mounted) return;
              // Chiudi spinner
              Navigator.of(context).pop();
              if (!mounted) return;
              if (state.errore != null) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('❌ ${state.errore}'),
                    backgroundColor: Colors.red,
                    duration: const Duration(seconds: 4),
                  ),
                );
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('✅ Sincronizzazione completata'),
                    backgroundColor: Colors.green,
                  ),
                );
              }
            },
          ),
          if (state.isInTurno)
            _actionItem(
              icon: Icons.flag,
              label: 'Completa',
              iconColor: Colors.green,
              onTap: () => _confermaFineTurno(),
            ),
          _actionItem(
            icon: Icons.logout,
            label: 'Esci',
            onTap: () async {
              await state.logout();
              if (mounted) {
                Navigator.of(context).popUntil((route) => route.isFirst);
              }
            },
          ),
        ],
      ),
    );
  }

  Widget _actionItem({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    Color? iconColor,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: iconColor ?? Colors.indigo, size: 24),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                color: iconColor ?? Colors.indigo.shade700,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTurnoCard(AppState state) {
    final turno = state.turnoCorrenteSync;
    if (turno == null) return const SizedBox.shrink();
    final percorso = turno != null
        ? state.percorsi.where((p) => p.id == turno.idPercorso).firstOrNull
        : null;

    return Container(
      margin: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.indigo.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.indigo.shade100, width: 1),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.route, color: Colors.indigo, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    percorso?.nome ?? (turno != null ? 'Percorso sconosciuto' : 'Nessun percorso'),
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                      color: Colors.indigo,
                    ),
                  ),
                ),
                if (turno == null || turno.completato)
                  IconButton(
                    icon: const Icon(Icons.add_circle_outline, color: Colors.indigo),
                    tooltip: 'Scegli percorso',
                    onPressed: () => _mostraSceltaPercorso(state),
                  ),
                if (state.isInTurno)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.green,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text(
                      'IN CORSO',
                      style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),
              ],
            ),
            const Divider(height: 20),
            if (turno != null)
              Row(
                children: [
                  const Icon(Icons.access_time, size: 16, color: Colors.grey),
                  const SizedBox(width: 6),
                  Text(
                    'Iniziato: ${_formatData(turno.dataInizio)}',
                    style: const TextStyle(color: Colors.grey, fontSize: 13),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildTimeline(List<Timbro> timbri) {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      itemCount: timbri.length,
      itemBuilder: (context, index) {
        final timbro = timbri[index];
        final state = context.read<AppState>();
        final descPunto = state.configurazione?.puntiControllo
            .where((p) => p.id == timbro.idPunto)
            .firstOrNull
            ?.descrizione;
        return ListTile(
          leading: CircleAvatar(
            backgroundColor: Colors.indigo,
            child: Text('${index + 1}'),
          ),
          title: Text(descPunto ?? 'Punto: ${timbro.idPunto}'),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(_formatData(timbro.timestamp)),
              if (timbro.nota != null && timbro.nota!.isNotEmpty)
                Text('Nota: ${timbro.nota}', maxLines: 1),
              if (timbro.nomeFoto != null && timbro.nomeFoto!.isNotEmpty)
                const Row(
                  children: [
                    Icon(Icons.photo, size: 16, color: Colors.grey),
                    SizedBox(width: 4),
                    Text('Foto scattata'),
                  ],
                ),
            ],
          ),
          trailing: const Icon(Icons.edit, size: 18, color: Colors.grey),
          onTap: () async {
            final fotoPath = await state.database.leggiFotoPathLocale(timbro.id);
            if (!context.mounted) return;
            final result = await Navigator.of(context).push<TimbroResult>(
              MaterialPageRoute(
                builder: (_) => TimbroDetailScreen(
                  idPunto: timbro.idPunto,
                  descrizionePunto: descPunto,
                  notaIniziale: timbro.nota,
                  fotoPathIniziale: fotoPath,
                ),
              ),
            );
            if (result != null && context.mounted) {
              await state.aggiornaTimbro(
                timbro.id,
                nota: result.nota,
                nomeFoto: result.nomeFoto,
                percorsoFoto: result.percorsoFoto,
              );
            }
          },
        );
      },
    );
  }

  Widget _buildNfcButton() {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: SizedBox(
          width: double.infinity,
          height: 60,
          child: ElevatedButton.icon(
            onPressed: _nfcInAttesa ? null : _leggiNfc,
            icon: _nfcInAttesa
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.nfc, size: 28),
            label: Text(
              _nfcInAttesa ? 'Avvicina il tag NFC...' : 'Lettura TAG/NFC',
              style: const TextStyle(fontSize: 18),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.indigo,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ),
      ),
    );
  }

  String _formatData(DateTime dt) {
    return '${dt.day}/${dt.month}/${dt.year} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }

  String _formatDurata(DateTime inizio, DateTime fine) {
    final diff = fine.difference(inizio);
    final min = diff.inMinutes;
    final sec = diff.inSeconds % 60;
    return '${min} min ${sec} sec';
  }

  Widget _dettaglioInfo(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          SizedBox(
            width: 80,
            child: Text(label, style: const TextStyle(color: Colors.grey, fontSize: 13)),
          ),
          Expanded(
            child: Text(value, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
          ),
        ],
      ),
    );
  }
}

/// Dati di un turno completato con il conteggio delle letture.
class _TurnoConLetture {
  final Turno turno;
  final int numLetture;

  _TurnoConLetture({required this.turno, required this.numLetture});
}
