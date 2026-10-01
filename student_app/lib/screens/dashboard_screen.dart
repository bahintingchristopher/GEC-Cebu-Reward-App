import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../blocs/auth/auth_event.dart';
import '../blocs/auth/auth_bloc.dart';
import '../blocs/history/history_bloc.dart';
import '../blocs/history/history_event.dart';
import '../blocs/tasks/task_bloc.dart';
import '../blocs/tasks/task_event.dart';
import '../blocs/rewards/reward_bloc.dart';
import '../blocs/rewards/reward_event.dart';
import '../repositories/auth_repository.dart';
import '../models/user_model.dart';
import '../widgets/points_badge.dart';
import '../widgets/student_qr_card.dart';
import '../widgets/email_prompt_modal.dart';
import '../services/realtime_events.dart';
import 'tasks_tab.dart';
import 'rewards_tab.dart';
import 'history_tab.dart';
import 'profile_screen.dart';
import '../widgets/copyright_footer.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  late TabController _tabController;
  final AuthRepository _authRepo = AuthRepository();
  String _token = '';
  int _points = 0;
  String _qrToken = '';
  String _studentName = '';
  String? _userId;
  String? _email;
  StreamSubscription<Map<String, dynamic>>? _realtimeSub;
  Timer? _pointsRefreshTimer;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addObserver(this);
    _initSession();
  }

  void _initSession() async {
    try {
      final token = await _authRepo.getToken();
      if (token != null) {
        if (mounted) setState(() => _token = token);
        _startRealtime(token);
        _startPointsSilentRefresh(token);
        final profile = await _authRepo.getProfile(token);
        if (profile != null && mounted) {
          setState(() {
            _points = profile.totalPoints;
            _qrToken = profile.qrToken ?? '';
            _studentName = profile.fullName;
            _userId = profile.userId;
            _email = profile.email;
          });
          if (profile.email == null) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted) _maybePromptForEmail(token);
            });
          }
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load profile: $e')),
        );
      }
    }
  }

  Future<void> _maybePromptForEmail(String token) async {
    // Guard again at show time: the 20s refresh may have learned that an
    // address exists since _initSession ran.
    if (_email != null) return;
    await showEmailPromptModal(context, token: token);
    // Closed either way. Nothing is stored on skip, so the prompt
    // returns the next time the app is opened.
  }

  void _startRealtime(String token) {
    RealtimeEvents.instance.start(token);
    _realtimeSub ??= RealtimeEvents.instance.events.listen((event) {
      if (event['type'] == 'points' && event['total'] is int) {
        final total = event['total'] as int;
        if (mounted) setState(() => _points = total);
      }
    });
  }


  void _startPointsSilentRefresh(String token) {
    _pointsRefreshTimer?.cancel();
    _pointsRefreshTimer = Timer.periodic(const Duration(seconds: 20), (_) {
      _refreshPointsSilently(token);
    });
  }

  Future<void> _refreshPointsSilently(String token) async {
    if (!mounted) return;
    try {
      final profile = await _authRepo.getProfile(token);
      if (profile != null && mounted) {
        setState(() {
          _points = profile.totalPoints;
          _qrToken = profile.qrToken ?? _qrToken;
          _studentName = profile.fullName;
          _userId = profile.userId;
        });
      }
    } catch (_) {
      // Silent: the WS push or the next refresh cycle self-corrects.
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _token.isNotEmpty) {
      _refreshPointsSilently(_token);
    }
  }
  @override
  void dispose() {
    _realtimeSub?.cancel();
    _realtimeSub = null;
    _pointsRefreshTimer?.cancel();
    _pointsRefreshTimer = null;
    WidgetsBinding.instance.removeObserver(this);
    RealtimeEvents.instance.stop();
    _authRepo.close();
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFDEEE9),
      appBar: AppBar(
        backgroundColor: const Color(0xFFFDEEE9),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.logout, color: Colors.black54),
          onPressed: () {
            context.read<AuthBloc>().add(AuthLogoutRequested());
            Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
          },
        ),
        title: const Text(
          'GEC Cebu Rewards Plus',
          style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.person_outline, color: Colors.black54),
            tooltip: 'Profile',
            onPressed: _openProfile,
          ),
        ],
      ),
      body: _token.isEmpty
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFFF8566)))
          : SafeArea(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Points', style: TextStyle(color: Colors.grey, fontSize: 12)),
                            SizedBox(height: 4),
                            Text(
                              'Your available reward points:',
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                            ),
                            SizedBox(height: 4),
                            Text(
                              'Earn by attending activities',
                              style: TextStyle(color: Colors.grey, fontSize: 12),
                            ),
                          ],
                        ),
                        PointsBadge(points: _points),
                      ],
                    ),
                  ),
                  if (_qrToken.isNotEmpty)
                    StudentQrCard(
                      studentName: _studentName,
                      userId: _userId,
                      qrToken: _qrToken,
                    ),
                  const SizedBox(height: 9),
                  TabBar(
                    controller: _tabController,
                    labelColor: const Color(0xFFFF8566),
                    unselectedLabelColor: Colors.grey,
                    indicatorColor: const Color(0xFFFF8566),
                    indicatorWeight: 3,
                    tabs: const [
                      Tab(text: 'Tasks'),
                      Tab(text: 'Rewards'),
                      Tab(text: 'History'),
                    ],
                  ),
                  Expanded(
                    child: Container(
                      color: const Color(0xFFFDEEE9),
                      child: TabBarView(
                        controller: _tabController,
                        children: [
                          TasksTab(token: _token),
                          RewardsTab(
                            token: _token,
                            availablePoints: _points,
                            onRedeemed: _refreshPoints,
                          ),
                          HistoryTab(token: _token),
                        ],
                      ),
                    ),
                  ),
                  const CopyrightFooter(),
                ],
              ),
            ),
    );
  }

  void _openProfile() async {
    final updated = await Navigator.push<User>(
      context,
      MaterialPageRoute(builder: (_) => ProfileScreen(token: _token)),
    );
    if (updated != null && mounted) {
      setState(() {
        _studentName = updated.fullName;
      });
    }
  }

  void _refreshPoints() async {
    try {
      if (!mounted) return;
      final profile = await _authRepo.getProfile(_token);
      if (profile != null) {
        if (mounted) {
          setState(() {
            _points = profile.totalPoints;
            _qrToken = profile.qrToken ?? _qrToken;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to refresh points: $e')),
        );
      }
    }
    if (!mounted) return;
    context.read<HistoryBloc>().add(LoadHistory(_token));
    context.read<TaskBloc>().add(LoadTasks(_token));
    context.read<RewardBloc>().add(LoadRewards(_token));
  }
}
