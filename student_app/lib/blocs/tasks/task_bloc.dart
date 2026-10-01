import 'package:flutter_bloc/flutter_bloc.dart';
import 'task_event.dart';
import 'task_state.dart';
import '../../repositories/task_repository.dart';

class TaskBloc extends Bloc<TaskEvent, TaskState> {
  final TaskRepository _repository;

  TaskBloc(this._repository) : super(TaskInitial()) {
    on<LoadTasks>(_onLoad);
  }

  Future<void> _onLoad(LoadTasks event, Emitter<TaskState> emit) async {
    emit(TaskLoading());
    try {
      final tasks = await _repository.getTasks(event.token);
      emit(TaskLoaded(tasks));
    } catch (e) {
      emit(TaskError(e.toString().replaceFirst('Exception: ', '')));
    }
  }
}
