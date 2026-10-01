class Task {
  final int id;
  final String title;
  final String? description;
  final int pointsReward;
  final int isActive;
  final bool attended;
  final String? attendedAt;
  final int timesAttended;

  const Task({
    required this.id,
    required this.title,
    this.description,
    required this.pointsReward,
    this.isActive = 1,
    this.attended = false,
    this.attendedAt,
    this.timesAttended = 0,
  });

  factory Task.fromJson(Map<String, dynamic> json) {
    return Task(
      id: (json['id'] as int?) ?? 0,
      title: (json['title'] as String?) ?? '',
      description: json['description'],
      pointsReward: json['points_reward'] ?? 0,
      isActive: json['is_active'] ?? 1,
      attended: json['attended'] ?? json['attended_today'] ?? false,
      attendedAt: json['attended_at'],
      timesAttended: json['times_attended'] ?? 0,
    );
  }

  bool get hasAttended => attended;
  bool get hasAttendedBefore => timesAttended > 0;
}
