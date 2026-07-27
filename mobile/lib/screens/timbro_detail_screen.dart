import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

/// Risultato del dialogo timbro (nota + foto).
class TimbroResult {
  final String? nota;
  final String? nomeFoto;
  final String? percorsoFoto;

  TimbroResult({this.nota, this.nomeFoto, this.percorsoFoto});
}

/// Schermata per aggiungere dettagli (nota e/o foto) a un timbro.
class TimbroDetailScreen extends StatefulWidget {
  final String idPunto;
  final String? descrizionePunto;
  final String? notaIniziale;
  final String? fotoPathIniziale;

  const TimbroDetailScreen({
    super.key,
    required this.idPunto,
    this.descrizionePunto,
    this.notaIniziale,
    this.fotoPathIniziale,
  });

  @override
  State<TimbroDetailScreen> createState() => _TimbroDetailScreenState();
}

class _TimbroDetailScreenState extends State<TimbroDetailScreen> {
  late final TextEditingController _notaController;
  final _picker = ImagePicker();
  String? _fotoPath;
  bool _caricamentoFoto = false;

  @override
  void initState() {
    super.initState();
    _notaController = TextEditingController(text: widget.notaIniziale ?? '');
    _fotoPath = widget.fotoPathIniziale;
  }

  @override
  void dispose() {
    _notaController.dispose();
    super.dispose();
  }

  Future<void> _scattaFoto() async {
    setState(() => _caricamentoFoto = true);

    try {
      final foto = await _picker.pickImage(
        source: ImageSource.camera,
        maxWidth: 1920,
        maxHeight: 1920,
        imageQuality: 80,
      );

      if (foto != null) {
        setState(() => _fotoPath = foto.path);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Errore fotocamera: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }

    setState(() => _caricamentoFoto = false);
  }

  void _conferma() {
    final result = TimbroResult(
      nota: _notaController.text.isNotEmpty ? _notaController.text : null,
      nomeFoto: _fotoPath != null
          ? '${widget.idPunto}_${DateTime.now().millisecondsSinceEpoch}.jpg'
          : null,
      percorsoFoto: _fotoPath,
    );

    Navigator.of(context).pop(result);
  }

  void _salta() {
    Navigator.of(context).pop(null);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.descrizionePunto ?? 'Punto: ${widget.idPunto}'),
        actions: [
          TextButton(
            onPressed: _salta,
            child: const Text('Salta'),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(
              Icons.edit_note,
              size: 48,
              color: Colors.indigo,
            ),
            const SizedBox(height: 16),
            const Text(
              'Aggiungi dettagli (opzionale)',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),

            // Campo nota
            TextField(
              controller: _notaController,
              maxLines: 4,
              maxLength: 500,
              decoration: const InputDecoration(
                labelText: 'Nota (opzionale)',
                hintText: 'Es. Vetro rotto, maniglia danneggiata...',
                border: OutlineInputBorder(),
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 24),

            // Sezione foto
            const Text(
              'Foto (opzionale)',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 8),

            if (_fotoPath != null)
              Column(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.file(
                      File(_fotoPath!),
                      height: 200,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return Container(
                          height: 200,
                          color: Colors.grey[200],
                          child: const Center(
                            child: Icon(Icons.broken_image, size: 48),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextButton.icon(
                    onPressed: () => setState(() => _fotoPath = null),
                    icon: const Icon(Icons.delete, color: Colors.red),
                    label: const Text(
                      'Rimuovi foto',
                      style: TextStyle(color: Colors.red),
                    ),
                  ),
                ],
              )
            else
              SizedBox(
                height: 120,
                child: OutlinedButton.icon(
                  onPressed: _caricamentoFoto ? null : _scattaFoto,
                  icon: _caricamentoFoto
                      ? const CircularProgressIndicator()
                      : const Icon(Icons.camera_alt, size: 32),
                  label: const Text('Scatta foto'),
                  style: OutlinedButton.styleFrom(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),

            const SizedBox(height: 32),

            // Bottone conferma
            SizedBox(
              height: 50,
              child: ElevatedButton.icon(
                onPressed: _conferma,
                icon: const Icon(Icons.check),
                label: const Text(
                  'Conferma lettura',
                  style: TextStyle(fontSize: 16),
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
    );
  }
}
