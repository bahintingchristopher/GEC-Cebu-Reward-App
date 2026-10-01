import 'package:flutter_bloc/flutter_bloc.dart';
import 'reward_event.dart';
import 'reward_state.dart';
import '../../repositories/reward_repository.dart';

class RewardBloc extends Bloc<RewardEvent, RewardState> {
  final RewardRepository _repository;

  RewardBloc(this._repository) : super(RewardInitial()) {
    on<LoadRewards>(_onLoad);
    on<RedeemReward>(_onRedeem);
  }

  Future<void> _onLoad(LoadRewards event, Emitter<RewardState> emit) async {
    emit(RewardLoading());
    try {
      final rewards = await _repository.getRewards(event.token);
      emit(RewardLoaded(rewards));
    } catch (e) {
      emit(RewardError(e.toString().replaceFirst('Exception: ', '')));
    }
  }

  Future<void> _onRedeem(RedeemReward event, Emitter<RewardState> emit) async {
    try {
      await _repository.redeemReward(event.token, event.rewardId);
      emit(RewardLoading());
      final rewards = await _repository.getRewards(event.token);
      emit(RewardLoaded(rewards));
    } catch (e) {
      emit(RewardError(e.toString().replaceFirst('Exception: ', '')));
    }
  }
}
