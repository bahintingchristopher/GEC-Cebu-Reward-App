import 'package:flutter_bloc/flutter_bloc.dart';
import 'history_event.dart';
import 'history_state.dart';
import '../../repositories/history_repository.dart';

class HistoryBloc extends Bloc<HistoryEvent, HistoryState> {
  final HistoryRepository _repository;

  HistoryBloc(this._repository) : super(HistoryInitial()) {
    on<LoadHistory>(_onLoad);
  }

  Future<void> _onLoad(LoadHistory event, Emitter<HistoryState> emit) async {
    emit(HistoryLoading());
    try {
      final history = await _repository.getHistory(event.token);
      emit(HistoryLoaded(history));
    } catch (e) {
      emit(HistoryError(e.toString().replaceFirst('Exception: ', '')));
    }
  }
}
