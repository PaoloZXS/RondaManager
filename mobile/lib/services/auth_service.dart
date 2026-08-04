import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/guardia.dart';

/// Servizio di autenticazione.
/// Gestisce il salvataggio sicuro del PIN nel KeyStore Android
/// e la verifica delle credenziali.
class AuthService {
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  static const _pinPrefix = 'pin_';
  static const _guardiaCorrenteKey = 'guardia_corrente_id';
  static const _guardiaLoginTsKey = 'guardia_corrente_ts';

  /// Salva il PIN nel KeyStore in modo sicuro.
  Future<void> salvaPin(String guardiaId, String pin) async {
    final hash = _hashPin(pin);
    await _secureStorage.write(key: '$_pinPrefix$guardiaId', value: hash);
  }

  /// Verifica se il PIN è corretto per la guardia.
  Future<bool> verificaPin(String guardiaId, String pin, Guardia guardia) async {
    final hashInput = _hashPin(pin);
    return guardia.pin == hashInput;
  }

  /// Salva l'ID della guardia correntemente loggata,
  /// insieme al timestamp di inizio sessione (per la scadenza sessione).
  Future<void> setGuardiaCorrente(String guardiaId) async {
    await _secureStorage.write(key: _guardiaCorrenteKey, value: guardiaId);
    await _secureStorage.write(
      key: _guardiaLoginTsKey,
      value: DateTime.now().toIso8601String(),
    );
  }

  /// Recupera l'ID della guardia corrente.
  Future<String?> getGuardiaCorrente() async {
    return await _secureStorage.read(key: _guardiaCorrenteKey);
  }

  /// Restituisce il timestamp di inizio sessione della guardia corrente.
  Future<DateTime?> getSessionTimestamp() async {
    final ts = await _secureStorage.read(key: _guardiaLoginTsKey);
    if (ts == null) return null;
    return DateTime.tryParse(ts);
  }

  /// Rimuove la guardia corrente (logout).
  Future<void> logout() async {
    await _secureStorage.delete(key: _guardiaCorrenteKey);
    await _secureStorage.delete(key: _guardiaLoginTsKey);
  }

  /// Calcola l'SHA-256 del PIN.
  String _hashPin(String pin) {
    final bytes = utf8.encode(pin);
    final digest = sha256.convert(bytes);
    return digest.toString();
  }
}
