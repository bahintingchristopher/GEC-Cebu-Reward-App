import 'package:flutter/material.dart';
import '../repositories/auth_repository.dart';
import '../models/user_model.dart';

class ProfileScreen extends StatefulWidget {
  final String token;
  const ProfileScreen({super.key, required this.token});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _fullNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _repo = AuthRepository();
  bool _loading = false;
  bool _saving = false;
  User? _user;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final user = await _repo.getProfile(widget.token);
    if (!mounted) return;
    setState(() {
      _user = user;
      _loading = false;
      if (user != null) {
        _fullNameController.text = user.fullName;
        _emailController.text = user.email ?? '';
      }
    });
  }

  Future<void> _save() async {
    final fullName = _fullNameController.text.trim();
    final email = _emailController.text.trim();
    if (fullName.isEmpty) {
      _showMessage('Full name cannot be empty');
      return;
    }
    setState(() => _saving = true);
    try {
      final updated = await _repo.updateProfile(
        widget.token,
        fullName: fullName,
        email: email,
      );
      if (!mounted) return;
      setState(() => _user = updated);
      Navigator.pop(context, updated);
    } catch (e) {
      if (mounted) _showMessage(e.toString().replaceFirst('Exception: ', ''), isError: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _showMessage(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFDEEE9),
      appBar: AppBar(
        backgroundColor: const Color(0xFFFDEEE9),
        elevation: 0,
        title: const Text(
          'My Profile',
          style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFFF8566)))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Icon(Icons.account_circle_rounded, size: 90, color: Color(0xFFFF8566)),
                  const SizedBox(height: 8),
                  Text(
                    _user?.username ?? '',
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Colors.grey, fontSize: 14),
                  ),
                  const SizedBox(height: 24),
                  _buildField(_fullNameController, 'Full Name', Icons.person_outline),
                  const SizedBox(height: 12),
                  _buildField(
                    _emailController,
                    'Email Address',
                    Icons.email_outlined,
                    keyboardType: TextInputType.emailAddress,
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF9FAFC),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.badge_outlined, color: Color(0xFFFF8566), size: 22),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            _user?.userId ?? 'No user ID',
                            style: const TextStyle(color: Colors.grey, fontSize: 14),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    height: 52,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF4D49FF),
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
                      ),
                      onPressed: _saving ? null : _save,
                      child: _saving
                          ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
                          : const Text(
                              'Save',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                            ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildField(TextEditingController controller, String label, IconData icon,
      {TextInputType? keyboardType}) {
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
              keyboardType: keyboardType,
              decoration: InputDecoration(
                hintText: label,
                border: InputBorder.none,
                hintStyle: const TextStyle(color: Colors.grey, fontSize: 13),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
