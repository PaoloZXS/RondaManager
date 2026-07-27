import 'dart:convert';
import 'dart:typed_data';
import 'package:cryptography/cryptography.dart';
import 'package:pointycastle/export.dart' hide Mac;
import '../utils/cosntants.dart';

/// Servizio di crittografia AES-256-GCM.
/// Gestisce la derivazione delle chiavi, cifratura e decifratura.
class CryptoServices {
  late final SecretKey _aesKey;

  /// Inizializza il servizio con la passphrase offuscata dal QR Code.
  /// La chiave AES finale è derivata da: passphrase + segreto hardcoded.
  Future<void> initialize(String passphraseOffuscata) async {
    final combined = '$passphraseOffuscata${AppConstants.segretoHardcoded}';
    final keyBytes = _deriveKey(combined, 32); // 256 bit
    _aesKey = SecretKey(keyBytes);
  }

  /// Deriva una chiave di [length] byte dalla stringa [input]
  /// usando PBKDF2-HMAC-SHA256.
  Uint8List _deriveKey(String input, int length) {
    final pbkdf2 = PBKDF2KeyDerivator(HMac(SHA256Digest(), 64));
    final salt = utf8.encode('R0nd4S4lt!') as Uint8List;
    pbkdf2.init(Pbkdf2Parameters(salt, 10000, length));

    final inputBytes = Uint8List.fromList(utf8.encode(input));
    return pbkdf2.process(inputBytes) as Uint8List;
  }

  /// Cifra il testo [plainText] con AES-256-GCM.
  /// Restituisce il testo cifrato in formato Base64.
  Future<String> encrypt(String plainText) async {
    final aesGcm = AesGcm.with256bits();

    final secretBox = await aesGcm.encrypt(
      utf8.encode(plainText),
      secretKey: _aesKey,
    );

    // Combina nonce + ciphertext + mac in un unico payload Base64
    final combined = Uint8List.fromList([
      ...secretBox.nonce,
      ...secretBox.cipherText,
      ...secretBox.mac.bytes,
    ]);

    return base64.encode(combined);
  }

  /// Decifra il testo cifrato [cipherBase64] con AES-256-GCM.
  /// Restituisce il testo in chiaro.
  Future<String> decrypt(String cipherBase64) async {
    final aesGcm = AesGcm.with256bits();

    final combined = base64.decode(cipherBase64);

    // Separa nonce (12 byte), ciphertext, mac (16 byte)
    const nonceLength = 12;
    const macLength = 16;

    final nonce = combined.sublist(0, nonceLength);
    final cipherText = combined.sublist(
      nonceLength,
      combined.length - macLength,
    );
    final mac = combined.sublist(combined.length - macLength);

    final secretBox = SecretBox(
      cipherText,
      nonce: nonce,
      mac: Mac(mac),
    );

    final plainText = await aesGcm.decrypt(
      secretBox,
      secretKey: _aesKey,
    );

    return utf8.decode(plainText);
  }

  /// Cifra i dati del QR Code con la chiave hardcoded di configurazione.
  /// Usata dal pannello web per generare il QR, ma disponibile
  /// anche qui per test/verifica.
  static Future<String> encryptQrConfig(
    String plainText, {
    String? customSecret,
  }) async {
    final secret = customSecret ?? AppConstants.configQrSecret;
    final keyBytes = _staticDeriveKey(secret, 32);
    final key = SecretKey(keyBytes);
    final aesGcm = AesGcm.with256bits();

    final secretBox = await aesGcm.encrypt(
      utf8.encode(plainText),
      secretKey: key,
    );

    final combined = Uint8List.fromList([
      ...secretBox.nonce,
      ...secretBox.cipherText,
      ...secretBox.mac.bytes,
    ]);

    return base64.encode(combined);
  }

  /// Decifra i dati del QR Code con la chiave hardcoded di configurazione.
  static Future<String> decryptQrConfig(String cipherBase64) async {
    final keyBytes = _staticDeriveKey(AppConstants.configQrSecret, 32);
    final key = SecretKey(keyBytes);
    final aesGcm = AesGcm.with256bits();

    final combined = base64.decode(cipherBase64);

    const nonceLength = 12;
    const macLength = 16;

    final nonce = combined.sublist(0, nonceLength);
    final cipherText = combined.sublist(
      nonceLength,
      combined.length - macLength,
    );
    final mac = combined.sublist(combined.length - macLength);

    final secretBox = SecretBox(
      cipherText,
      nonce: nonce,
      mac: Mac(mac),
    );

    final plainText = await aesGcm.decrypt(
      secretBox,
      secretKey: key,
    );

    return utf8.decode(plainText);
  }

  static Uint8List _staticDeriveKey(String input, int length) {
    final pbkdf2 = PBKDF2KeyDerivator(HMac(SHA256Digest(), 64));
    final salt = utf8.encode('R0nd4S4lt!') as Uint8List;
    pbkdf2.init(Pbkdf2Parameters(salt, 10000, length));

    final inputBytes = Uint8List.fromList(utf8.encode(input));
    return pbkdf2.process(inputBytes) as Uint8List;
  }
}
