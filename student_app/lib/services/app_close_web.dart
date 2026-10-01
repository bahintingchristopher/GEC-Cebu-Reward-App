import 'package:web/web.dart' as web;

Future<void> closeApp() async {
  web.window.close();
}

bool get isWebPlatform => true;

