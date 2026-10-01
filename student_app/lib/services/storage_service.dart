import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class StorageService {
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  // Save session token upon login
  Future<void> saveToken(String token) async {
    await _storage.write(key: 'auth_token', value: token);
  }

  // Read session token on app startup
  Future<String?> getToken() async {
    return await _storage.read(key: 'auth_token');
  }

  // Clear session on logout
  Future<void> clearSession() async {
    await _storage.delete(key: 'auth_token');
  }
}