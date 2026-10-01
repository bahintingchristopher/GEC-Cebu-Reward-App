import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/redemption_model.dart';

class HistoryRepository {
  final http.Client _client = http.Client();

  Future<List<Redemption>> getHistory(String token) async {
    final response = await _client.get(
      Uri.parse('${ApiConfig.baseUrl}/student/history'),
      headers: {'Authorization': 'Bearer $token'},
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body) as List;
      return data.map((e) => Redemption.fromJson(e)).toList();
    } else {
      throw Exception('Failed to load history');
    }
  }

  void close() {
    _client.close();
  }
}
