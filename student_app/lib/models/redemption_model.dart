class Redemption {
  final int id;
  final int pointsSpent;
  final String status;
  final String redeemedAt;
  final String? claimedAt;
  final String rewardTitle;
  final String? rewardDescription;

  const Redemption({
    required this.id,
    required this.pointsSpent,
    required this.status,
    required this.redeemedAt,
    this.claimedAt,
    required this.rewardTitle,
    this.rewardDescription,
  });

  factory Redemption.fromJson(Map<String, dynamic> json) {
    return Redemption(
      id: (json['id'] as int?) ?? 0,
      pointsSpent: json['points_spent'] ?? 0,
      status: json['status'] ?? 'pending',
      redeemedAt: json['redeemed_at'] ?? '',
      claimedAt: json['claimed_at'],
      rewardTitle: json['reward_title'] ?? '',
      rewardDescription: json['reward_description'],
    );
  }
}
