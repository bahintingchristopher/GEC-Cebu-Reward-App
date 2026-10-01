import 'package:flutter/material.dart';
import '../repositories/auth_repository.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _usernameController = TextEditingController();
  final _userIdController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmController = TextEditingController();
  final _repo = AuthRepository();

  bool _verified = false;
  bool _loading = false;
  bool _obscure = true;
  String? _resetToken;

  @override
  void dispose() {
    _usernameController.dispose();
    _userIdController.dispose();
    _newPasswordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  void _showMessage(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  Future<void> _verifyIdentity() async {
    final username = _usernameController.text.trim();
    final userId = _userIdController.text.trim();

    if (username.isEmpty || userId.isEmpty) {
      _showMessage('Please enter your username and User ID');
      return;
    }

    setState(() => _loading = true);
    try {
      final token = await _repo.forgotPassword(username, userId);
      if (!mounted) return;
      setState(() {
        _verified = true;
        _resetToken = token;
      });
      _showMessage('Identity verified. Set your new password.');
    } catch (e) {
      if (mounted) _showMessage(e.toString().replaceFirst('Exception: ', ''), isError: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _resetPassword() async {
    final newPassword = _newPasswordController.text;
    final confirm = _confirmController.text;

    if (newPassword.isEmpty || confirm.isEmpty) {
      _showMessage('Please fill in the password fields');
      return;
    }
    if (newPassword.length < 6) {
      _showMessage('Password must be at least 6 characters');
      return;
    }
    if (newPassword != confirm) {
      _showMessage('Passwords do not match');
      return;
    }

    setState(() => _loading = true);
    try {
      await _repo.resetPassword(_resetToken!, newPassword);
      if (!mounted) return;
      _showMessage('Password reset successfully. You can now log in.');
      Navigator.pop(context, true);
    } catch (e) {
      if (mounted) _showMessage(e.toString().replaceFirst('Exception: ', ''), isError: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFDEEE9),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black54),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 12),
                Text(
                  _verified ? 'Set a New Password' : 'Recover Your Account',
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Text(
                  _verified
                      ? 'Create a new password for your account'
                      : 'Enter your username and your registered User ID to verify your identity',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.grey, fontSize: 13),
                ),
                const SizedBox(height: 24),
                if (!_verified) ...[
                  _buildField(_usernameController, 'Username', Icons.person_outline),
                  const SizedBox(height: 12),
                  _buildField(_userIdController, 'User ID', Icons.badge),
                  const SizedBox(height: 24),
                  _buildButton('Verify Identity', _verifyIdentity),
                ] else ...[
                  _buildField(_newPasswordController, 'New Password', Icons.lock_outline,
                      isPassword: true),
                  const SizedBox(height: 12),
                  _buildField(_confirmController, 'Confirm New Password', Icons.lock_outline,
                      isPassword: true, showObscureToggle: false),
                  const SizedBox(height: 24),
                  _buildButton('Reset Password', _resetPassword),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildButton(String label, VoidCallback onPressed) {
    return SizedBox(
      height: 52,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF4D49FF),
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
        ),
        onPressed: _loading ? null : onPressed,
        child: _loading
            ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
            : Text(
                label,
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
              ),
      ),
    );
  }

  Widget _buildField(TextEditingController controller, String label, IconData icon,
      {bool isPassword = false, bool showObscureToggle = true,
       TextInputType? keyboardType}) {
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
              keyboardType: keyboardType,
              decoration: InputDecoration(
                hintText: label,
                border: InputBorder.none,
                hintStyle: const TextStyle(color: Colors.grey, fontSize: 13),
              ),
            ),
          ),
          if (isPassword && showObscureToggle)
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

