import 'package:equatable/equatable.dart';

abstract class RewardEvent extends Equatable {
  const RewardEvent();

  @override
  List<Object?> get props => [];
}

class LoadRewards extends RewardEvent {
  final String token;
  const LoadRewards(this.token);

  @override
  List<Object?> get props => [token];
}

class RedeemReward extends RewardEvent {
  final String token;
  final int rewardId;
  const RedeemReward(this.token, this.rewardId);

  @override
  List<Object?> get props => [token, rewardId];
}
