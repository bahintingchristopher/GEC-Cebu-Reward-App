import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/reward_model.dart';

class RewardRepository {
  final http.Client _client = http.Client();

  Future<List<Reward>> getRewards(String token) async {
    final response = await _client.get(
      Uri.parse('${ApiConfig.baseUrl}/student/rewards'),
      headers: {'Authorization': 'Bearer $token'},
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body) as List;
      return data.map((e) => Reward.fromJson(e)).toList();
    } else {
      throw Exception('Failed to load rewards');
    }
  }

  Future<int> redeemReward(String token, int rewardId) async {
    final response = await _client.post(
      Uri.parse('${ApiConfig.baseUrl}/student/rewards/$rewardId/redeem'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 201) {
      final data = jsonDecode(response.body);
      return data['remaining_points'] ?? 0;
    } else {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? 'Failed to redeem reward');
    }
  }

  void close() {
    _client.close();
  }
}
