import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../blocs/rewards/reward_bloc.dart';
import '../blocs/rewards/reward_event.dart';
import '../blocs/rewards/reward_state.dart';
import '../models/reward_model.dart';
import '../widgets/reward_card.dart';

class RewardsTab extends StatefulWidget {
  final String token;
  final int availablePoints;
  final VoidCallback onRedeemed;
  const RewardsTab({
    super.key,
    required this.token,
    required this.availablePoints,
    required this.onRedeemed,
  });

  @override
  State<RewardsTab> createState() => _RewardsTabState();
}

class _RewardsTabState extends State<RewardsTab> {
  @override
  void initState() {
    super.initState();
    context.read<RewardBloc>().add(LoadRewards(widget.token));
  }

  void _onTap(Reward reward) {
    if (widget.availablePoints < reward.pointsRequired) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
              'You need ${reward.pointsRequired - widget.availablePoints} more points to redeem "${reward.title}".'),
        ),
      );
      return;
    }
    _confirmRedeem(reward);
  }

  void _confirmRedeem(Reward reward) {
    final confirm = showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Redeem Reward'),
        content: Text(
            'Are you sure you want to redeem "${reward.title}" for ${reward.pointsRequired} points?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Redeem', style: TextStyle(color: Color(0xFFFF8566))),
          ),
        ],
      ),
    );

    confirm.then((value) async {
      if (value == true && mounted) {
        context.read<RewardBloc>().add(RedeemReward(widget.token, reward.id));
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Reward instantly redeemed! Points deducted automatically.')),
        );
        widget.onRedeemed();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<RewardBloc, RewardState>(
      builder: (context, state) {
        if (state is RewardLoading) {
          return const Center(child: CircularProgressIndicator(color: Color(0xFFFF8566)));
        }
        if (state is RewardError) {
          return Center(child: Text(state.message, style: const TextStyle(color: Colors.grey)));
        }
        if (state is RewardLoaded) {
          if (state.rewards.isEmpty) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.card_giftcard, color: Colors.grey, size: 48),
                  SizedBox(height: 12),
                  Text('No rewards available', style: TextStyle(color: Colors.grey)),
                ],
              ),
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.all(20),
            itemCount: state.rewards.length,
            itemBuilder: (context, index) {
              final reward = state.rewards[index];
              return RewardCard(
                reward: reward,
                availablePoints: widget.availablePoints,
                onRedeem: () => _onTap(reward),
              );
            },
          );
        }
        return const SizedBox.shrink();
      },
    );
  }
}
