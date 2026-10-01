import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../blocs/tasks/task_bloc.dart';
import '../blocs/tasks/task_event.dart';
import '../blocs/tasks/task_state.dart';
import '../widgets/task_card.dart';

class TasksTab extends StatefulWidget {
  final String token;
  const TasksTab({super.key, required this.token});

  @override
  State<TasksTab> createState() => _TasksTabState();
}

class _TasksTabState extends State<TasksTab> {
  @override
  void initState() {
    super.initState();
    context.read<TaskBloc>().add(LoadTasks(widget.token));
  }

  Future<void> _refresh() async {
    context.read<TaskBloc>().add(LoadTasks(widget.token));
    await Future.delayed(const Duration(milliseconds: 400));
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<TaskBloc, TaskState>(
      builder: (context, state) {
        if (state is TaskLoading) {
          return const Center(child: CircularProgressIndicator(color: Color(0xFFFF8566)));
        }
        if (state is TaskError) {
          return _buildEmpty(state.message);
        }
        if (state is TaskLoaded) {
          if (state.tasks.isEmpty) {
            return _buildEmpty('No tasks available yet');
          }
          return RefreshIndicator(
            color: const Color(0xFFFF8566),
            onRefresh: _refresh,
            child: ListView.builder(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(20),
              itemCount: state.tasks.length,
              itemBuilder: (context, index) {
                final task = state.tasks[index];
                return TaskCard(task: task);
              },
            ),
          );
        }
        return const SizedBox.shrink();
      },
    );
  }

  Widget _buildEmpty(String message) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.inbox_rounded, color: Colors.grey, size: 48),
          const SizedBox(height: 12),
          Text(message, style: const TextStyle(color: Colors.grey)),
        ],
      ),
    );
  }
}
