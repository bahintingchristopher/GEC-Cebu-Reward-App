import 'package:flutter/material.dart';
import '../models/reward_model.dart';

class RewardCard extends StatelessWidget {
  final Reward reward;
  final int availablePoints;
  final VoidCallback onRedeem;

  const RewardCard({
    super.key,
    required this.reward,
    required this.availablePoints,
    required this.onRedeem,
  });

  bool get canAfford => availablePoints >= reward.pointsRequired;

  @override
  Widget build(BuildContext context) {
    final color = canAfford ? Colors.green : Colors.grey;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onRedeem,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.orange.shade50,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.emoji_events_outlined,
                  color: canAfford ? const Color(0xFFFF8566) : Colors.grey,
                  size: 28,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      reward.title,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Requires ${reward.pointsRequired} points',
                      style: const TextStyle(color: Colors.grey, fontSize: 11),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      canAfford
                          ? 'You can redeem this'
                          : 'You need ${reward.pointsRequired - availablePoints} more points',
                      style: TextStyle(
                        color: color,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: Color(0xFFFF8566)),
            ],
          ),
        ),
      ),
    );
  }
}
