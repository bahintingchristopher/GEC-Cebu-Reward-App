import 'package:equatable/equatable.dart';

abstract class HistoryEvent extends Equatable {
  const HistoryEvent();

  @override
  List<Object?> get props => [];
}

class LoadHistory extends HistoryEvent {
  final String token;
  const LoadHistory(this.token);

  @override
  List<Object?> get props => [token];
}
