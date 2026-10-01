import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'token_store.dart';

/// Native (Android/iOS/macOS/Linux/Windows) token storage backed by
/// flutter_secure_storage (Keystore/Keychain).
class _IOTokenStore implements TokenStore {
  static const _storage = FlutterSecureStorage();
  static const _key = 'student_token';

  @override
  Future<void> write(String value) => _storage.write(key: _key, value: value);

  @override
  Future<String?> read() => _storage.read(key: _key);

  @override
  Future<void> delete() => _storage.delete(key: _key);
}

TokenStore platformStore() => _IOTokenStore();
