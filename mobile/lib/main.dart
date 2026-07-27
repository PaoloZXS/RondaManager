import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'providers/app_state.dart';
import 'screens/configurazione_screen.dart';
import 'screens/login_screen.dart';
import 'screens/turno_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Richiesta permessi all'avvio
  await _richiediPermessi();

  runApp(const StrigeKeeperApp());
}

/// Richiede tutti i permessi necessari all'app.
Future<void> _richiediPermessi() async {
  await [
    Permission.camera,
    Permission.storage,
  ].request();
}

class StrigeKeeperApp extends StatelessWidget {
  const StrigeKeeperApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) {
        final state = AppState();
        state.initialize();
        return state;
      },
      child: MaterialApp(
        title: 'StrigeKeeper',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xFF1A237E),
            brightness: Brightness.light,
          ),
          useMaterial3: true,
          appBarTheme: const AppBarTheme(
            centerTitle: true,
            elevation: 2,
          ),
        ),
        home: const AppEntryPoint(),
      ),
    );
  }
}

/// Widget di ingresso che determina quale schermata mostrare
/// in base allo stato di configurazione e autenticazione.
class AppEntryPoint extends StatelessWidget {
  const AppEntryPoint({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AppState>(
      builder: (context, state, _) {
        // Mostra loader mentre si inizializza
        if (state.caricamento) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        // Se non configurato → configurazione (ID telefono)
        if (!state.isConfigured) {
          return const ConfigurazioneScreen();
        }

        // Se non autenticato → login
        if (!state.isAuthenticated) {
          return const LoginScreen();
        }
        // Altrimenti → schermata turno
        return const TurnoScreen();
      },
    );
  }
}
