class Reward {
  final int id;
  final String title;
  final String? description;
  final int pointsRequired;
  final int stockQuantity;
  final int isActive;

  const Reward({
    required this.id,
    required this.title,
    this.description,
    required this.pointsRequired,
    this.stockQuantity = 0,
    this.isActive = 1,
  });

  factory Reward.fromJson(Map<String, dynamic> json) {
    return Reward(
      id: (json['id'] as int?) ?? 0,
      title: (json['title'] as String?) ?? '',
      description: json['description'],
      pointsRequired: json['points_required'] ?? 0,
      stockQuantity: json['stock_quantity'] ?? 0,
      isActive: json['is_active'] ?? 1,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'points_required': pointsRequired,
        'stock_quantity': stockQuantity,
        'is_active': isActive,
      };
}
