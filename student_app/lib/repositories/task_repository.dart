import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/task_model.dart';

class TaskRepository {
  final http.Client _client = http.Client();

  Future<List<Task>> getTasks(String token) async {
    final response = await _client.get(
      Uri.parse('${ApiConfig.baseUrl}/student/tasks'),
      headers: {'Authorization': 'Bearer $token'},
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body) as List;
      return data.map((e) => Task.fromJson(e)).toList();
    } else {
      throw Exception('Failed to load tasks');
    }
  }

  void close() {
    _client.close();
  }
}
