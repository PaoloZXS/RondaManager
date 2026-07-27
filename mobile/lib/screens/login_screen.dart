import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/guardia.dart';
import '../providers/app_state.dart';

/// Schermata di login.
/// La guardia seleziona il suo nome dal dropdown e inserisce il PIN.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _pinController = TextEditingController();
  Guardia? _guardiaSelezionata;
  bool _mostraPin = false;

  @override
  void dispose() {
    _pinController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (_guardiaSelezionata == null) {
      _mostraSnackBar('Seleziona un sorvegliante');
      return;
    }

    if (_pinController.text.isEmpty) {
      _mostraSnackBar('Inserisci il PIN');
      return;
    }

    final state = context.read<AppState>();
    final success = await state.login(
      _guardiaSelezionata!,
      _pinController.text,
    );

    if (success && mounted) {
      Navigator.of(context).popUntil((route) => route.isFirst);
    } else if (!success && mounted) {
      _mostraSnackBar('PIN non valido');
    }
  }

  void _mostraSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Accesso'),
      ),
      body: Consumer<AppState>(
        builder: (context, state, _) {
          if (state.caricamento) {
            return const Center(child: CircularProgressIndicator());
          }

          // Se già autenticato, non mostrare nulla
          if (state.isAuthenticated) {
            return const SizedBox.shrink();
          }

          return Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Image.asset(
                    'assets/logo.png',
                    width: 100,
                    height: 100,
                    fit: BoxFit.contain,
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'StrigeKeeper',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Seleziona il sorvegliante e inserisci il PIN',
                    style: TextStyle(color: Colors.grey),
                  ),
                  const SizedBox(height: 32),

                  // Dropdown sorveglianti
                  DropdownButtonFormField<Guardia>(
                    value: _guardiaSelezionata,
                    decoration: const InputDecoration(
                      labelText: 'Sorvegliante',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.person),
                    ),
                    items: state.guardie.map((guardia) {
                      return DropdownMenuItem(
                        value: guardia,
                        child: Text(guardia.nomeCompleto),
                      );
                    }).toList(),
                    onChanged: (value) {
                      setState(() => _guardiaSelezionata = value);
                    },
                  ),
                  const SizedBox(height: 16),

                  // Campo PIN
                  TextField(
                    controller: _pinController,
                    obscureText: !_mostraPin,
                    decoration: InputDecoration(
                      labelText: 'PIN',
                      border: const OutlineInputBorder(),
                      prefixIcon: const Icon(Icons.lock),
                      suffixIcon: IconButton(
                        icon: Icon(
                          _mostraPin
                              ? Icons.visibility_off
                              : Icons.visibility,
                        ),
                        onPressed: () {
                          setState(() => _mostraPin = !_mostraPin);
                        },
                      ),
                    ),
                    keyboardType: TextInputType.number,
                    maxLength: 6,
                  ),
                  const SizedBox(height: 24),

                  // Bottone login
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton.icon(
                      onPressed: _handleLogin,
                      icon: const Icon(Icons.login),
                      label: const Text(
                        'Accedi',
                        style: TextStyle(fontSize: 18),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.indigo,
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Bottone logout forzato (se c'è errore)
                  if (state.errore != null)
                    Text(
                      state.errore!,
                      style: const TextStyle(color: Colors.red),
                    ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
