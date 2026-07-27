import 'package:battery_plus/battery_plus.dart';

/// Servizio per la batteria.
class GpsService {
  /// Ottiene la percentuale di batteria del dispositivo.
  Future<double> getBatteria() async {
    try {
      final battery = Battery();
      final level = await battery.batteryLevel;
      if (level >= 0 && level <= 100) {
        return level.toDouble();
      }
    } catch (_) {
      // Se fallisce, restituisce un valore di default
    }
    return 100.0;
  }
}
