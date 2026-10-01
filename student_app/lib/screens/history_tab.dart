import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../blocs/history/history_bloc.dart';
import '../blocs/history/history_event.dart';
import '../blocs/history/history_state.dart';
import '../widgets/history_tile.dart';

class HistoryTab extends StatefulWidget {
  final String token;
  const HistoryTab({super.key, required this.token});

  @override
  State<HistoryTab> createState() => _HistoryTabState();
}

class _HistoryTabState extends State<HistoryTab> {
  @override
  void initState() {
    super.initState();
    context.read<HistoryBloc>().add(LoadHistory(widget.token));
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<HistoryBloc, HistoryState>(
      builder: (context, state) {
        if (state is HistoryLoading) {
          return const Center(child: CircularProgressIndicator(color: Color(0xFFFF8566)));
        }
        if (state is HistoryError) {
          return Center(child: Text(state.message, style: const TextStyle(color: Colors.grey)));
        }
        if (state is HistoryLoaded) {
          if (state.history.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.receipt_long, color: Colors.grey, size: 48),
                  const SizedBox(height: 12),
                  const Text('No redemptions yet', style: TextStyle(color: Colors.grey)),
                  const SizedBox(height: 8),
                  const Text(
                    'Redeem a reward to see it here',
                    style: TextStyle(color: Colors.grey, fontSize: 12),
                  ),
                ],
              ),
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.all(20),
            itemCount: state.history.length,
            itemBuilder: (context, index) => HistoryTile(
              redemption: state.history[index],
            ),
          );
        }
        return const SizedBox.shrink();
      },
    );
  }
}
