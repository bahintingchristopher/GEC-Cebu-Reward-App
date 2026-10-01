class User {
  final int id;
  final String username;
  final String fullName;
  final String? email;
  final String role;
  final String? userId;
  final String? qrToken;
  final int totalPoints;

  const User({
    required this.id,
    required this.username,
    required this.fullName,
    this.email,
    required this.role,
    this.userId,
    this.qrToken,
    required this.totalPoints,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    // A blank address counts as 'never set': the nag in dashboard_screen
    // keys off email == null.
    final rawEmail = (json['email'] as String?)?.trim();
    return User(
      id: (json['id'] as int?) ?? 0,
      username: (json['username'] as String?) ?? '',
      fullName: json['full_name'] ?? json['fullName'] ?? '',
      email: (rawEmail == null || rawEmail.isEmpty) ? null : rawEmail,
      role: json['role'] ?? 'student',
      userId: json['user_id'] ?? json['userId'],
      qrToken: json['qr_token'] ?? json['qrToken'],
      totalPoints: json['total_points'] ?? json['totalPoints'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'username': username,
        'full_name': fullName,
        'email': email,
        'role': role,
        'user_id': userId,
        'qr_token': qrToken,
        'total_points': totalPoints,
      };
}
