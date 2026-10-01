import 'dart:convert';
import 'package:http/http.dart' as http;
import '../services/token_store.dart';
import '../config/api_config.dart';
import '../models/user_model.dart';

class AuthRepository {
  final http.Client _client = http.Client();
  final TokenStore _storage = TokenStore();

  Future<User> login(String username, String password) async {
    final response = await _client.post(
      Uri.parse('${ApiConfig.baseUrl}/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'username': username, 'password': password}),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      await _storage.write(data['token'].toString());
      return User.fromJson(data['user']);
    } else {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? 'Login failed');
    }
  }

  Future<User> register({
    required String username,
    required String password,
    required String fullName,
    required String email,
    String? userId,
  }) async {
    final response = await _client.post(
      Uri.parse('${ApiConfig.baseUrl}/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'username': username,
        'password': password,
        'full_name': fullName,
        'email': email,
        'user_id': userId,
      }),
    );

    if (response.statusCode == 201) {
      final data = jsonDecode(response.body);
      await _storage.write(data['token'].toString());
      return User.fromJson(data['user']);
    } else {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? 'Registration failed');
    }
  }

  // Step 1 of account recovery: verify identity using the user ID.
  // Returns a short-lived reset token if the user ID matches the account.
  Future<String> forgotPassword(String username, String userId) async {
    final response = await _client.post(
      Uri.parse('${ApiConfig.baseUrl}/auth/forgot-password'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'username': username, 'user_id': userId}),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return (data['reset_token'] as String?) ?? '';
    } else {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? 'Recovery failed');
    }
  }

  // Step 2 of account recovery: set a new password with the reset token.
  Future<void> resetPassword(String resetToken, String newPassword) async {
    final response = await _client.post(
      Uri.parse('${ApiConfig.baseUrl}/auth/reset-password'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'reset_token': resetToken, 'new_password': newPassword}),
    );

    if (response.statusCode != 200) {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? 'Reset failed');
    }
  }

  Future<String?> getToken() async {
    return await _storage.read();
  }

  Future<void> saveToken(String token) async {
    await _storage.write(token);
  }

  Future<User?> getProfile(String token) async {
    final response = await _client.get(
      Uri.parse('${ApiConfig.baseUrl}/student/profile'),
      headers: {'Authorization': 'Bearer $token'},
    );

    if (response.statusCode == 200) {
      return User.fromJson(jsonDecode(response.body));
    }
    return null;
  }

  // Update the student's editable profile fields (full_name, email).
  // A null or blank [email] leaves the stored address untouched, which is
  // what the backend does with an empty value.
  Future<User?> updateProfile(String token, {String? fullName, String? email}) async {
    final response = await _client.put(
      Uri.parse('${ApiConfig.baseUrl}/student/profile'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'full_name': fullName,
        'email': email,
      }),
    );

    if (response.statusCode == 200) {
      return User.fromJson(jsonDecode(response.body));
    } else {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? 'Update failed');
    }
  }

  Future<void> logout() async {
    await _storage.delete();
  }

  void close() {
    _client.close();
  }
}
