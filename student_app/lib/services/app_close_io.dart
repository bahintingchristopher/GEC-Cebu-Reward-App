import 'package:flutter/services.dart' show SystemNavigator;

Future<void> closeApp() async {
  try {
    await SystemNavigator.pop();
  } catch (_) {}
}

bool get isWebPlatform => false;

