import 'package:flutter_nfc_kit/flutter_nfc_kit.dart';

/// Servizio per la lettura dei tag NFC.
/// Legge l'ID univoco del tag NFC che identifica il punto di controllo.
class NfcService {
  /// Verifica se NFC è disponibile sul dispositivo.
  Future<bool> isNfcAvailable() async {
    final availability = await FlutterNfcKit.nfcAvailability;
    return availability == NFCAvailability.available;
  }

  /// Legge il tag NFC corrente.
  /// Restituisce l'ID del tag in formato decimale (identificativo del punto di controllo).
  Future<String> readTagId() async {
    final tag = await FlutterNfcKit.poll(
      timeout: Duration(seconds: 30),
    );
    // L'ID del tag NFC è in formato HEX big-endian (es. "0CA0B12C").
    // Lo convertiamo in decimale invertendo i byte (little-endian)
    // per matchare i valori REVERSE DEC salvati in Supabase.
    return _hexToDecimale(tag.id);
  }

  /// Converte un ID HEX in REVERSE DEC (byte order invertito).
  /// I tag NFC danno l'HEX in big-endian, ma Supabase usa little-endian.
  /// Esempio: "0CA0B12C" (hex) -> "2CB1A00C" (reversed) -> "749838348" (dec)
  String _hexToDecimale(String hex) {
    try {
      final cleanHex = hex.replaceAll(' ', '');
      final bytes = List.generate(cleanHex.length ~/ 2,
          (i) => cleanHex.substring(i * 2, i * 2 + 2));
      final reversedHex = bytes.reversed.join();
      final valore = int.parse(reversedHex, radix: 16);
      return valore.toString();
    } catch (_) {
      return hex;
    }
  }

  /// Ferma la scansione NFC in corso.
  Future<void> stopPolling() async {
    await FlutterNfcKit.finish();
  }
}
