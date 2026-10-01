import 'token_store_stub.dart'
    if (dart.library.io) 'token_store_io.dart'
    if (dart.library.js_interop) 'token_store_web.dart'
    as impl;

/// Platform-neutral API for persisting the auth token.
///
/// On native platforms (Android/iOS/macOS/Linux/Windows) this uses
/// [FlutterSecureStorage] (Keychain/Keystore). On the web it falls back to
/// `localStorage` because flutter_secure_storage's web adapter needs WebCrypto,
/// which is unavailable over plain HTTP on a LAN IP (causing a
/// "Null check operator used on a null value" crash on `window.crypto!`).
abstract class TokenStore {
  Future<void> write(String value);
  Future<String?> read();
  Future<void> delete();

  factory TokenStore() => impl.platformStore();
}
