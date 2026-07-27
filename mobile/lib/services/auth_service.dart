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

  /// Salva l'ID della guardia correntemente loggata.
  Future<void> setGuardiaCorrente(String guardiaId) async {
    await _secureStorage.write(key: _guardiaCorrenteKey, value: guardiaId);
  }

  /// Recupera l'ID della guardia corrente.
  Future<String?> getGuardiaCorrente() async {
    return await _secureStorage.read(key: _guardiaCorrenteKey);
  }

  /// Rimuove la guardia corrente (logout).
  Future<void> logout() async {
    await _secureStorage.delete(key: _guardiaCorrenteKey);
  }

  /// Calcola l'SHA-256 del PIN.
  String _hashPin(String pin) {
    final bytes = utf8.encode(pin);
    final digest = sha256.convert(bytes);
    return digest.toString();
  }
}
