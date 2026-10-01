import 'app_close_stub.dart'
    if (dart.library.io) 'app_close_io.dart'
    if (dart.library.js_interop) 'app_close_web.dart'
    as impl;

Future<void> closeApp() => impl.closeApp();

bool get isWebPlatform => impl.isWebPlatform;

