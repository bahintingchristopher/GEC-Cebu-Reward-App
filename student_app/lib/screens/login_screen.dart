import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../blocs/auth/auth_bloc.dart';
import '../blocs/auth/auth_event.dart';
import '../blocs/auth/auth_state.dart';
import 'forgot_password_screen.dart';
import '../services/admin_redirect.dart';
import '../widgets/copyright_footer.dart';
import '../widgets/disclaimer_modal.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

/// Mirrors the backend pattern in utils/validators.js so the student gets
/// an instant message instead of a round-trip. The server still checks.
final RegExp _emailPattern = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]{2,}$');

class _LoginScreenState extends State<LoginScreen> {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _fullNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _userIdController = TextEditingController();
  bool _isRegistering = false;
  bool _obscure = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      showDisclaimerModal(context);
    });
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    _fullNameController.dispose();
    _emailController.dispose();
    _userIdController.dispose();
    super.dispose();
  }

  void _submit() {
    final username = _usernameController.text.trim();
    final password = _passwordController.text.trim();

    if (username.isEmpty || password.isEmpty) {
      _showError('Please fill in all required fields');
      return;
    }

    final bloc = context.read<AuthBloc>();
    if (_isRegistering) {
      final fullName = _fullNameController.text.trim();
      if (fullName.isEmpty) {
        _showError('Please enter your full name');
        return;
      }
      final email = _emailController.text.trim();
      if (email.isEmpty) {
        _showError('Please enter your email address');
        return;
      }
      if (!_emailPattern.hasMatch(email) || email.contains('..')) {
        _showError('Please enter a valid email address');
        return;
      }
      bloc.add(AuthRegisterRequested(
        username: username,
        password: password,
        fullName: fullName,
        email: email,
        userId: _userIdController.text.trim().isEmpty ? null : _userIdController.text.trim(),
      ));
    } else {
      bloc.add(AuthLoginRequested(username, password));
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFDEEE9),
      body: SafeArea(
        child: BlocConsumer<AuthBloc, AuthState>(
          listener: (context, state) {
            if (state is AuthAuthenticated) {
              if (state.user.role != 'student') {
                // Keep students and admins on their own landing pages.
                final redirected = AdminRedirect.redirect();
                if (!redirected) {
                  _showError('Admin accounts must use the Admin Dashboard.');
                  context.read<AuthBloc>().add(AuthLogoutRequested());
                }
                return;
              }
              // First login: main.dart's home BlocBuilder swaps to the dashboard.
              // After logout, that root route was removed (logout pushed '/login'
              // and wiped the stack), so navigate explicitly to avoid being stuck.
              if (ModalRoute.of(context)?.settings.name == '/login') {
                Navigator.pushNamedAndRemoveUntil(context, '/home', (route) => false);
              }
            } else if (state is AuthError) {
              _showError(state.message);
            }
          },
          builder: (context, state) {
            final isLoading = state is AuthLoading;
            return SingleChildScrollView(
              child: Column(
                children: [
                  const SizedBox(height: 60),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.only(
                        topLeft: Radius.circular(32),
                        topRight: Radius.circular(32),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Text(
                          'GEC Cebu Rewards Plus',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 26,
                            fontWeight: FontWeight.bold,
                            color: Colors.blueAccent, // Adjust color to match your theme
                          ),
                        ),
                        const SizedBox(height: 8), // Adds clean spacing between the headers
                                            
                        Text(
                          _isRegistering ? 'Create Account' : 'Welcome Back!',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _isRegistering
                              ? 'Register as a student to start earning points'
                              : 'Login to access your rewards dashboard',
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: Colors.grey, fontSize: 13),
                        ),
                        const SizedBox(height: 24),
                        if (_isRegistering) ...[
                          _buildField(_fullNameController, 'Full Name', Icons.person, isName: true),
                          const SizedBox(height: 12),
                          _buildField(
                            _emailController,
                            'Email Address',
                            Icons.email_outlined,
                            keyboardType: TextInputType.emailAddress,
                          ),
                          const SizedBox(height: 12),
                          _buildField(_userIdController, 'User ID (optional)', Icons.badge),
                          const SizedBox(height: 12),
                        ],
                        _buildField(_usernameController, 'Username', Icons.person_outline, isName: true),
                        const SizedBox(height: 12),
                        _buildField(_passwordController, 'Password', Icons.lock_outline, isPassword: true),
                        const SizedBox(height: 24),
                        SizedBox(
                          height: 52,
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF4D49FF),
                              elevation: 0,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(26),
                              ),
                            ),
                            onPressed: isLoading ? null : _submit,
                            child: isLoading
                                ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
                                : Text(
                                    _isRegistering ? 'Register' : 'Login',
                                    style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextButton(
                          onPressed: isLoading
                              ? null
                              : () => setState(() => _isRegistering = !_isRegistering),
                          child: Text(
                            _isRegistering
                                ? 'Already have an account? Login'
                                : "Don't have an account? Register",
                            style: const TextStyle(color: Color(0xFF4D49FF)),
                          ),
                        ),
                        if (!_isRegistering) ...[
                          const SizedBox(height: 4),
                          TextButton(
                            onPressed: isLoading
                                ? null
                                : () => Navigator.push(
                                    context,
                                    MaterialPageRoute(builder: (_) => const ForgotPasswordScreen()),
                                  ),
                            child: const Text(
                              'Forgot password?',
                              style: TextStyle(color: Colors.grey, decoration: TextDecoration.underline),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),
                  const CopyrightFooter(),
                  const SizedBox(height: 16),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildField(TextEditingController controller, String label, IconData icon,
      {bool isPassword = false, bool isName = false, TextInputType? keyboardType}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFC),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Icon(icon, color: const Color(0xFFFF8566), size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: TextField(
              controller: controller,
              obscureText: isPassword ? _obscure : false,
              keyboardType: keyboardType ?? (isName || isPassword ? TextInputType.text : TextInputType.emailAddress),
              decoration: InputDecoration(
                hintText: label,
                border: InputBorder.none,
                hintStyle: const TextStyle(color: Colors.grey, fontSize: 13),
              ),
            ),
          ),
          if (isPassword)
            GestureDetector(
              onTap: () => setState(() => _obscure = !_obscure),
              child: Icon(
                _obscure ? Icons.visibility_off : Icons.visibility,
                color: Colors.grey,
                size: 20,
              ),
            ),
        ],
      ),
    );
  }
}


