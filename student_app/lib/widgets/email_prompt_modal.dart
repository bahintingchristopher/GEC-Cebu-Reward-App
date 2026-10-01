import 'package:flutter/material.dart';
import '../repositories/auth_repository.dart';

/// Asks a student who signed up before the email feature existed to add an
/// address. Shown on every app open while [User.email] is null; "Not now" just
/// closes it, so nothing is ever blocked from earning points.
class EmailPromptModal extends StatefulWidget {
  final String token;
  const EmailPromptModal({super.key, required this.token});

  @override
  State<EmailPromptModal> createState() => _EmailPromptModalState();
}

/// Mirrors the backend pattern in utils/validators.js so the message appears
/// without a round-trip. The server still validates and rejects duplicates.
final RegExp _emailPattern = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]{2,}$');

class _EmailPromptModalState extends State<EmailPromptModal> {
  final _controller = TextEditingController();
  final _repo = AuthRepository();
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    _repo.close();
    super.dispose();
  }

  Future<void> _save() async {
    final email = _controller.text.trim();
    if (email.isEmpty) {
      setState(() => _error = 'Please enter your email address');
      return;
    }
    if (!_emailPattern.hasMatch(email) || email.contains('..')) {
      setState(() => _error = 'Please enter a valid email address');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await _repo.updateProfile(widget.token, email: email);
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString().replaceFirst('Exception: ', '');
          _saving = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 28, 24, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(Icons.email_outlined, size: 44, color: Color(0xFFFF8566)),
            const SizedBox(height: 12),
            const Text(
              'Add your email',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.black87,
                fontSize: 22,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              'Add your email address so we can send you updates about your points and rewards. You can skip this for now and add it later from your profile.',
              textAlign: TextAlign.justify,
              style: TextStyle(fontSize: 14, color: Colors.black87, height: 1.4),
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFF9FAFC),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  const Icon(Icons.alternate_email, color: Color(0xFFFF8566), size: 22),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      keyboardType: TextInputType.emailAddress,
                      enabled: !_saving,
                      decoration: const InputDecoration(
                        hintText: 'Email Address',
                        border: InputBorder.none,
                        hintStyle: TextStyle(color: Colors.grey, fontSize: 13),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 10),
                child: Text(
                  _error!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Color(0xFFD32F2F),
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: TextButton(
                    onPressed: _saving ? null : () => Navigator.of(context).pop(false),
                    style: TextButton.styleFrom(foregroundColor: Colors.grey),
                    child: const Text(
                      'NOT NOW',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton(
                    onPressed: _saving ? null : _save,
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFF4D49FF),
                      disabledBackgroundColor: Colors.grey.shade300,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: _saving
                        ? const SizedBox(
                            height: 18,
                            width: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                            ),
                          )
                        : const Text(
                            'SAVE',
                            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                          ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Returns true when the student saved an address, false when they skipped.
Future<bool> showEmailPromptModal(BuildContext context, {required String token}) async {
  final saved = await showDialog<bool>(
    context: context,
    // Unlike the disclaimer, this one is dismissible: email is required but a
    // student must never be locked out of their points over a missing address.
    barrierDismissible: true,
    builder: (_) => EmailPromptModal(token: token),
  );
  return saved ?? false;
}