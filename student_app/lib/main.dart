import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'blocs/auth/auth_bloc.dart';
import 'blocs/tasks/task_bloc.dart';
import 'blocs/rewards/reward_bloc.dart';
import 'blocs/history/history_bloc.dart';
import 'repositories/auth_repository.dart';
import 'repositories/task_repository.dart';
import 'repositories/reward_repository.dart';
import 'repositories/history_repository.dart';
import 'screens/login_screen.dart';
import 'screens/dashboard_screen.dart'; 
import 'blocs/auth/auth_event.dart'; 
import 'blocs/auth/auth_state.dart';  
import 'screens/onboarding_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const RewardApp());
}

class RewardApp extends StatelessWidget {
  const RewardApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        // Dispatch CheckAuthStatus when AuthBloc is created
        BlocProvider(
          create: (_) => AuthBloc(AuthRepository())..add(CheckAuthStatus()),
        ),
        BlocProvider(create: (_) => TaskBloc(TaskRepository())),
        BlocProvider(create: (_) => RewardBloc(RewardRepository())),
        BlocProvider(create: (_) => HistoryBloc(HistoryRepository())),
      ],
      child: MaterialApp(
        title: 'GEC Cebu Rewards Plus',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          primarySwatch: Colors.orange,
          scaffoldBackgroundColor: const Color(0xFFFDEEE9),
          fontFamily: 'default',
        ),
        // The student app is phone-first. On a wide laptop or desktop viewport
        // Flutter would stretch the layout across the entire display, so the app
        // is laid out in a handset-width column and centred. Phones and tablets
        // are narrower than the breakpoint, so they are not affected.
        builder: (context, child) {
          final media = MediaQuery.of(context);
          const phoneWidth = 430.0;
          const wideScreenBreakpoint = 800.0;
          if (child == null || media.size.width <= wideScreenBreakpoint) {
            return child ?? const SizedBox.shrink();
          }
          return ColoredBox(
            color: const Color(0xFFE8E6E6),
            child: Center(
              child: SizedBox(
                width: phoneWidth,
                // Re-place the app in the narrower column so anything that reads
                // MediaQuery (dialogs, the email prompt) sizes to it as well.
                child: MediaQuery(
                  data: media.copyWith(size: Size(phoneWidth, media.size.height)),
                  child: child,
                ),
              ),
            ),
          );
        },
        // Listen to AuthState to decide which screen to display first
        home: BlocBuilder<AuthBloc, AuthState>(
          builder: (context, state) {
            if (state is AuthAuthenticated) {
              return const DashboardScreen(); // Navigate straight to main screen
            } else if (state is AuthUnauthenticated || state is AuthError) {
              return const LoginScreen();
            } else {
              // AuthInitial or AuthLoading: display splash/loading indicator
              return const Scaffold(
                body: Center(
                  child: CircularProgressIndicator(),
                ),
              );
            }
          },
        ),
        routes: {
          '/login': (context) => const LoginScreen(),
          '/onboarding': (context) => const OnboardingScreen(),
          '/home': (context) => const DashboardScreen(),
        },
      ),
    );
  }
}
