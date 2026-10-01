import 'package:web/web.dart' as web;
import 'token_store.dart';

/// Web token storage backed by localStorage.
///
/// flutter_secure_storage's web adapter encrypts with WebCrypto
/// (`window.crypto!`), which throws "Null check operator used on a null value"
/// on plain-HTTP origins (non-localhost). localStorage works everywhere on the
/// web, including over HTTP on a LAN IP, so it is used for the iOS PWA.
class _WebTokenStore implements TokenStore {
  static const _key = 'student_token';

  @override
  Future<void> write(String value) async {
    web.window.localStorage.setItem(_key, value);
  }

  @override
  Future<String?> read() async {
    return web.window.localStorage.getItem(_key);
  }

  @override
  Future<void> delete() async {
    web.window.localStorage.removeItem(_key);
  }
}

TokenStore platformStore() => _WebTokenStore();
