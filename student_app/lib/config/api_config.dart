import 'package:flutter/foundation.dart' show kIsWeb;

class ApiConfig {
  /// Fixed address assigned to this app by the server admin.
  /// Kept as-is (used by mobile/APK builds and as fallback).
  static const String _fixedBase = "http://192.168.107.135:5000/api";

  /// Optional build-time override: --dart-define=API_BASE=http://host:5000/api
  static const String _overrideBase = String.fromEnvironment('API_BASE');

  /// The address of the computer running the Express server.
  /// Web builds use the current page origin automatically, so the same build
  /// works from http://localhost:5000 (dev machine) and from the server IP the
  /// admin/students type in their browser (e.g. http://192.168.107.135:5000).
  static String get baseUrl {
    if (_overrideBase.isNotEmpty) return _overrideBase;
    if (kIsWeb) return '${Uri.base.scheme}://${Uri.base.host}:${Uri.base.port}/api';
    return _fixedBase;
  }

  /// Host extracted from [baseUrl].
  static String get host {
    final uri = Uri.parse(baseUrl);
    return uri.host;
  }

  /// Port extracted from [baseUrl].
  static int get port {
    final uri = Uri.parse(baseUrl);
    return uri.port;
  }
}